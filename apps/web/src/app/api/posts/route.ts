import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";
import { postSchema, checkContentLength, MAX_FILE_SIZE, checkFileExtension } from "@/lib/validations";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

const POST_ATTACHMENTS_BUCKET = "post-attachments";
const MAX_POST_ATTACHMENTS = 5;

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { page, limit, from, to } = parsePagination(
            new URL(req.url),
            { page: 1, limit: 25 }
        );

        const supabase = createAdminClient();
        const { data, error, count } = await supabase
            .from("posts")
            .select(`
                *,
                users (
                    first_name,
                    last_name,
                    role,
                    avatar_url
                ),
                comments (count),
                post_likes (count),
                post_views (count),
                post_attachments (id, file_url, file_name, file_type, file_size)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("[GET /api/posts] Supabase error:", error);
            return NextResponse.json({ error: "Request failed" }, { status: 400 });
        }

        const postIds = (data || []).map((p) => p.id);
        const likedSet = new Set<string>();
        if (postIds.length > 0) {
            const { data: liked } = await supabase
                .from("post_likes")
                .select("post_id")
                .eq("user_id", session.userId)
                .in("post_id", postIds);
            (liked || []).forEach((row) => likedSet.add(row.post_id));
        }

        const enriched = (data || []).map((p) => ({
            ...p,
            like_count: p.post_likes?.[0]?.count ?? 0,
            view_count: p.post_views?.[0]?.count ?? 0,
            has_liked: likedSet.has(p.id),
            attachments: p.post_attachments ?? [],
        }));

        return NextResponse.json(buildPaginatedResponse(enriched, count || 0, { page, limit, from, to }));
    } catch (err) {
        console.error("[GET /api/posts] Unhandled error:", err);
        return NextResponse.json(
            { error: "Internal server error", detail: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 requests per 5 minutes
    const rateLimitResult = await checkRateLimit(getRateLimitKey(req, "posts"), {
        maxRequests: 10,
        windowSeconds: 300,
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: "Too many posts. Please wait before posting again." },
            { status: 429 }
        );
    }

    const contentType = req.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let content: string;
    let files: File[] = [];

    if (isMultipart) {
        // Multipart upload (with possible attachments)
        const form = await req.formData();
        const rawContent = String(form.get("content") || "");
        const parsed = postSchema.safeParse({ content: rawContent });
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }
        content = sanitizeText(parsed.data.content);

        const allFiles = form.getAll("files");
        files = allFiles.filter((f): f is File => f instanceof File);

        if (files.length > MAX_POST_ATTACHMENTS) {
            return NextResponse.json(
                { error: `Maximum ${MAX_POST_ATTACHMENTS} attachments allowed.` },
                { status: 400 }
            );
        }
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: `"${file.name}" exceeds the 10MB limit.` },
                    { status: 413 }
                );
            }
            if (!checkFileExtension(file.name)) {
                return NextResponse.json(
                    { error: `File type for "${file.name}" is not allowed.` },
                    { status: 400 }
                );
            }
        }
    } else {
        // JSON path (no attachments)
        const sizeError = checkContentLength(req);
        if (sizeError) {
            return NextResponse.json({ error: sizeError }, { status: 413 });
        }
        const body = await req.json();
        const parsed = postSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }
        content = sanitizeText(parsed.data.content);
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("posts")
        .insert({
            user_id: session.userId,
            content,
        })
        .select(`
            *,
            users (
                first_name,
                last_name,
                role,
                avatar_url
            )
        `)
        .single();

    if (error) {
        return NextResponse.json({ error: "Request failed" }, { status: 400 });
    }

    // Upload attachments after the post is created so they reference a real post_id.
    const uploadedAttachments: Array<{ id: string; file_url: string; file_name: string; file_type: string; file_size: number }> = [];
    if (files.length > 0) {
        for (const file of files) {
            const safeName = file.name.replace(/\s+/g, "_");
            const path = `${data.id}/${Date.now()}_${safeName}`;
            const { error: storageError } = await supabase.storage
                .from(POST_ATTACHMENTS_BUCKET)
                .upload(path, file, { cacheControl: "3600", upsert: false });
            if (storageError) {
                console.error("[posts] storage upload failed", storageError);
                continue;
            }
            const { data: pub } = supabase.storage
                .from(POST_ATTACHMENTS_BUCKET)
                .getPublicUrl(path);
            const { data: attRow, error: attErr } = await supabase
                .from("post_attachments")
                .insert({
                    post_id: data.id,
                    file_url: pub.publicUrl,
                    file_name: file.name,
                    file_type: file.type || "application/octet-stream",
                    file_size: file.size,
                    uploaded_by: session.userId,
                })
                .select("id, file_url, file_name, file_type, file_size")
                .single();
            if (attErr) {
                console.error("[posts] attachment insert failed", attErr);
                continue;
            }
            if (attRow) uploadedAttachments.push(attRow);
        }
    }

    return NextResponse.json({ post: { ...data, attachments: uploadedAttachments } });
}
