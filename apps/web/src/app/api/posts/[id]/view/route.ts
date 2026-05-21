import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

export async function POST(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Upsert (idempotent — UNIQUE(post_id, user_id) guards duplicates).
    const { error } = await supabase
        .from("post_views")
        .upsert(
            { post_id: params.id, user_id: session.userId },
            { onConflict: "post_id,user_id", ignoreDuplicates: true }
        );

    if (error) {
        return NextResponse.json({ error: "Failed to mark viewed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
}
