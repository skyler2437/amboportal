import { getSession } from "@/lib/session";
import { adminClient } from "@ambo/database/admin-client";
import { NextResponse } from "next/server";

// Per-user starred/pinned chats (chat_stars table). POST = star, DELETE =
// unstar. Auth is the custom JWT session, so we use the service-role client.

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await adminClient
        .from("chat_stars")
        .insert({ user_id: session.userId, group_id: params.id });

    // 23505 = unique violation (already starred) → idempotent success.
    if (error && error.code !== "23505") {
        console.error("Error starring chat:", error);
        return NextResponse.json({ error: "Failed to star chat" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, starred: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await adminClient
        .from("chat_stars")
        .delete()
        .eq("user_id", session.userId)
        .eq("group_id", params.id);

    if (error) {
        console.error("Error unstarring chat:", error);
        return NextResponse.json({ error: "Failed to unstar chat" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, starred: false });
}
