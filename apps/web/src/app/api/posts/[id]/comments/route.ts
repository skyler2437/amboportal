import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("comments")
        .select(`
            *,
            users (
                first_name,
                last_name,
                role,
                avatar_url
            )
        `)
        .eq("post_id", params.id)
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: "Request failed" }, { status: 400 });
    }
    return NextResponse.json({ comments: data || [] });
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
        return NextResponse.json(
            { error: "Content is required" },
            { status: 400 }
        );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("comments")
        .insert({
            post_id: params.id,
            user_id: session.userId,
            content: sanitizeText(content),
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

    return NextResponse.json({ comment: data });
}
