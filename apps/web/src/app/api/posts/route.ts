import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";
import { postSchema, checkContentLength } from "@/lib/validations";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

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
                comments (count)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("[GET /api/posts] Supabase error:", error);
            return NextResponse.json({ error: "Request failed" }, { status: 400 });
        }

        return NextResponse.json(buildPaginatedResponse(data || [], count || 0, { page, limit, from, to }));
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

    // Payload size check
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

    const content = sanitizeText(parsed.data.content);

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

    // Notifications are now handled by the Supabase Database Webhook
    // dispatcher at /api/webhooks/notifications

    return NextResponse.json({ post: data });
}
