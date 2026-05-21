import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

const EVENT_ATTACHMENTS_BUCKET = "event-attachments";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string; attachmentId: string } }
) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: row } = await supabase
        .from("event_attachments")
        .select("file_url")
        .eq("id", params.attachmentId)
        .eq("event_id", params.id)
        .single();

    if (row?.file_url) {
        // Extract storage path from public URL
        const marker = `/${EVENT_ATTACHMENTS_BUCKET}/`;
        const idx = row.file_url.indexOf(marker);
        if (idx >= 0) {
            const path = row.file_url.slice(idx + marker.length);
            await supabase.storage.from(EVENT_ATTACHMENTS_BUCKET).remove([path]);
        }
    }

    const { error } = await supabase
        .from("event_attachments")
        .delete()
        .eq("id", params.attachmentId)
        .eq("event_id", params.id);

    if (error) {
        return NextResponse.json({ error: "Failed to delete attachment" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
}
