import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

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
        .from("post_likes")
        .select("user_id, created_at, users (id, first_name, last_name, avatar_url)")
        .eq("post_id", params.id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Request failed" }, { status: 400 });
    }
    return NextResponse.json({ likes: data || [] });
}
