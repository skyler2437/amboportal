import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";
import { MAX_FILE_SIZE, checkFileExtension } from "@/lib/validations";

const EVENT_ATTACHMENTS_BUCKET = "event-attachments";
const MAX_EVENT_ATTACHMENTS = 10;

export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("event_attachments")
        .select("id, file_url, file_name, file_type, file_size, created_at")
        .eq("event_id", params.id)
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: "Request failed" }, { status: 400 });
    }
    return NextResponse.json({ attachments: data || [] });
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const allFiles = form.getAll("files");
    const files = allFiles.filter((f): f is File => f instanceof File);

    if (files.length === 0) {
        return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { count: existingCount } = await supabase
        .from("event_attachments")
        .select("id", { count: "exact", head: true })
        .eq("event_id", params.id);

    if ((existingCount ?? 0) + files.length > MAX_EVENT_ATTACHMENTS) {
        return NextResponse.json(
            { error: `Maximum ${MAX_EVENT_ATTACHMENTS} attachments per event.` },
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

    const uploaded: Array<{ id: string; file_url: string; file_name: string; file_type: string; file_size: number }> = [];
    for (const file of files) {
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `${params.id}/${Date.now()}_${safeName}`;
        const { error: storageError } = await supabase.storage
            .from(EVENT_ATTACHMENTS_BUCKET)
            .upload(path, file, { cacheControl: "3600", upsert: false });
        if (storageError) {
            console.error("[event attachments] storage upload failed", storageError);
            continue;
        }
        const { data: pub } = supabase.storage
            .from(EVENT_ATTACHMENTS_BUCKET)
            .getPublicUrl(path);
        const { data: row, error: rowErr } = await supabase
            .from("event_attachments")
            .insert({
                event_id: params.id,
                file_url: pub.publicUrl,
                file_name: file.name,
                file_type: file.type || "application/octet-stream",
                file_size: file.size,
                uploaded_by: session.userId,
            })
            .select("id, file_url, file_name, file_type, file_size")
            .single();
        if (rowErr) {
            console.error("[event attachments] insert failed", rowErr);
            continue;
        }
        if (row) uploaded.push(row);
    }

    return NextResponse.json({ attachments: uploaded });
}
