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
    const { data: existing } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", params.id)
        .eq("user_id", session.userId)
        .maybeSingle();

    if (existing) {
        await supabase.from("post_likes").delete().eq("id", existing.id);
    } else {
        const { error } = await supabase
            .from("post_likes")
            .insert({ post_id: params.id, user_id: session.userId });
        if (error) {
            return NextResponse.json({ error: "Failed to like post" }, { status: 400 });
        }
    }

    const { count } = await supabase
        .from("post_likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", params.id);

    return NextResponse.json({ liked: !existing, like_count: count ?? 0 });
}
