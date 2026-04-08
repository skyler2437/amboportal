import { createAdminClient } from "@ambo/database/admin-client";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { chatMessageSchema, checkContentLength } from "@/lib/validations";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const groupId = req.nextUrl.searchParams.get("groupId");
        if (!groupId) {
            return NextResponse.json({ error: "groupId is required" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Verify user is a participant
        const { data: participant } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("group_id", groupId)
            .eq("user_id", session.userId)
            .single();

        if (!participant) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { data: messages, error } = await supabase
            .from("chat_messages")
            .select(`
                *,
                sender:users!chat_messages_sender_id_fkey(first_name, last_name, avatar_url)
            `)
            .eq("group_id", groupId)
            .order("created_at", { ascending: true });

        if (error) {
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        return NextResponse.json({ messages: messages || [] });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limit: 60 requests per minute
        const rateLimitResult = await checkRateLimit(getRateLimitKey(req, "chat-messages"), {
            maxRequests: 60,
            windowSeconds: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: "Too many messages. Please slow down." },
                { status: 429 }
            );
        }

        // Payload size check
        const sizeError = checkContentLength(req);
        if (sizeError) {
            return NextResponse.json({ error: sizeError }, { status: 413 });
        }

        const body = await req.json();
        const parsed = chatMessageSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { groupId } = parsed.data;
        const content = sanitizeText(parsed.data.content);

        const supabase = createAdminClient();

        // Verify user is a participant in this group
        const { data: participant } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("group_id", groupId)
            .eq("user_id", session.userId)
            .single();

        if (!participant) {
            return NextResponse.json(
                { error: "You are not a participant in this group" },
                { status: 403 }
            );
        }

        // Insert Message
        const { data: message, error } = await supabase
            .from("chat_messages")
            .insert({
                group_id: groupId,
                sender_id: session.userId,
                content: content,
            })
            .select()
            .single();

        if (error) {
            console.error("Error sending message:", error);
            return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
        }

        // Notifications are now handled by the Supabase Database Webhook
        // dispatcher at /api/webhooks/notifications

        return NextResponse.json({ message });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
