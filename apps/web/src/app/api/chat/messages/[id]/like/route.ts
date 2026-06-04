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

    // Resolve the message's group and verify the caller participates in it.
    const { data: message } = await supabase
        .from("chat_messages")
        .select("group_id")
        .eq("id", params.id)
        .maybeSingle();
    if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const { data: participant } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("group_id", message.group_id)
        .eq("user_id", session.userId)
        .maybeSingle();
    if (!participant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing } = await supabase
        .from("chat_message_likes")
        .select("id")
        .eq("message_id", params.id)
        .eq("user_id", session.userId)
        .maybeSingle();

    if (existing) {
        await supabase.from("chat_message_likes").delete().eq("id", existing.id);
    } else {
        const { error } = await supabase
            .from("chat_message_likes")
            .insert({ message_id: params.id, user_id: session.userId });
        if (error) {
            return NextResponse.json({ error: "Failed to like message" }, { status: 400 });
        }
    }

    const { count } = await supabase
        .from("chat_message_likes")
        .select("id", { count: "exact", head: true })
        .eq("message_id", params.id);

    return NextResponse.json({ liked: !existing, like_count: count ?? 0 });
}
