import { getSession } from "@/lib/session";
import { adminClient } from "@ambo/database/admin-client";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch the user's participations, including the per-user soft-delete
        // marker (mirrors mobile, which hides a chat the user swiped away until
        // a newer message arrives).
        const { data: participations, error: partError } = await adminClient
            .from("chat_participants")
            .select("group_id, deleted_at")
            .eq("user_id", session.userId);

        if (partError) {
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        const groupIds = (participations || []).map(p => p.group_id);

        if (groupIds.length === 0) {
            return NextResponse.json({ groups: [] });
        }

        const deletedAtByGroup = new Map<string, string | null>();
        for (const p of participations || []) {
            deletedAtByGroup.set(p.group_id, (p as { deleted_at?: string | null }).deleted_at ?? null);
        }

        const { data: groups, error: groupsError } = await adminClient
            .from("chat_groups")
            .select(`
                *,
                participants:chat_participants(
                    user:users(id, first_name, last_name, email, avatar_url)
                )
            `)
            .in("id", groupIds);

        if (groupsError) {
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        // Per-user starred chats (chat_stars). Tolerate the table not existing
        // yet so the chat list never hard-fails on it.
        let starredSet = new Set<string>();
        const { data: stars, error: starError } = await adminClient
            .from("chat_stars")
            .select("group_id")
            .eq("user_id", session.userId);
        if (!starError && stars) {
            starredSet = new Set(stars.map(s => s.group_id));
        }

        // Fetch last message per group (for unread, ordering, and soft-delete
        // resurfacing).
        const groupsWithMeta = await Promise.all(
            (groups || []).map(async (group) => {
                const { data: msgs } = await adminClient
                    .from("chat_messages")
                    .select("id, sender_id, content, created_at")
                    .eq("group_id", group.id)
                    .order("created_at", { ascending: false })
                    .limit(1);
                return {
                    ...group,
                    last_message: msgs && msgs.length > 0 ? msgs[0] : undefined,
                    starred: starredSet.has(group.id),
                };
            })
        );

        // Honor the per-user soft-delete: hide a chat the user deleted unless a
        // newer message has arrived since they deleted it.
        const visible = groupsWithMeta.filter((group) => {
            const deletedAt = deletedAtByGroup.get(group.id);
            if (!deletedAt) return true;
            if (!group.last_message) return false;
            return new Date(group.last_message.created_at) > new Date(deletedAt);
        });

        // Sort starred-first, then by most-recent activity (matches mobile).
        visible.sort((a, b) => {
            if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
            const aTime = a.last_message?.created_at || a.updated_at || a.created_at;
            const bTime = b.last_message?.created_at || b.updated_at || b.created_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return NextResponse.json({ groups: visible });
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

        const { name, participants } = await req.json();

        if (!Array.isArray(participants) || participants.length === 0) {
            return NextResponse.json(
                { error: "Participants must be a non-empty array" },
                { status: 400 }
            );
        }

        // 1. Create Group
        // Use adminClient to bypass RLS since auth is verified via custom JWT session above
        const { data: group, error: groupError } = await adminClient
            .from("chat_groups")
            .insert({
                name: name || null, // Allow unnamed groups (e.g. 1:1 DMs)
                created_by: session.userId,
            })
            .select()
            .single();

        if (groupError) {
            console.error("Error creating group:", groupError);
            return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
        }

        // 2. Add Participants (Creators + Invited)
        // Ensure creator is included and no duplicates
        const uniqueParticipants = Array.from(new Set([...participants, session.userId]));
        const participantsData = uniqueParticipants.map((userId) => ({
            group_id: group.id,
            user_id: userId,
        }));

        const { error: partError } = await adminClient
            .from("chat_participants")
            .insert(participantsData);

        if (partError) {
            console.error("Error adding participants:", partError);
            // In a real app, we might want to rollback the group creation here
            return NextResponse.json(
                { error: "Group created but failed to add participants" },
                { status: 500 }
            );
        }

        return NextResponse.json({ group });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
