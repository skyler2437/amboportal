import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { handleAuthError } from '@/lib/authError';
import { useChatReadStore } from '@/stores/chatReadStore';
import { createChatGroup } from '@/lib/chat';

export interface ChatGroup {
  id: string;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatGroupWithMeta extends ChatGroup {
  participants: { user_id: string; users: { first_name: string; last_name: string; avatar_url?: string } }[];
  lastMessage?: { content: string; created_at: string; sender_id?: string };
  hasUnread?: boolean;
  starred?: boolean;
}

// Starred chats float to the top; within each tier, most-recent activity wins.
function compareGroups(a: ChatGroupWithMeta, b: ChatGroupWithMeta): number {
  if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
  const aTime = a.lastMessage?.created_at || a.updated_at || a.created_at;
  const bTime = b.lastMessage?.created_at || b.updated_at || b.created_at;
  return new Date(bTime).getTime() - new Date(aTime).getTime();
}

export function useChatGroups(userId: string) {
  const [groups, setGroups] = useState<ChatGroupWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedOnce = useRef(false);
  // Track group IDs for scoped realtime subscription
  const groupIdsRef = useRef<string[]>([]);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    // Only show full loading state on initial load, not on refetches
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    setError(null);

    // Try to fetch with last_read_at, fall back to without it if the column doesn't exist yet
    let participantData: any[] | null = null;
    let hasLastReadAt = true;

    const { data: pData, error: pErr } = await supabase
      .from('chat_participants')
      .select('group_id, last_read_at')
      .eq('user_id', userId);

    if (pErr) {
      // Auth-shaped error: sign out so the user lands on login instead of the
      // inline "Try Again" state that can't recover from a stale JWT.
      if (handleAuthError(pErr)) {
        setLoading(false);
        return;
      }
      // Column might not exist yet (migration not applied) - fall back to basic query
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('chat_participants')
        .select('group_id')
        .eq('user_id', userId);

      if (fallbackErr) {
        if (handleAuthError(fallbackErr)) {
          setLoading(false);
          return;
        }
        setError(fallbackErr.message);
        setLoading(false);
        return;
      }
      participantData = fallbackData;
      hasLastReadAt = false;
    } else {
      participantData = pData;
    }

    const groupIds = (participantData || []).map((p: any) => p.group_id);
    groupIdsRef.current = groupIds;

    if (groupIds.length === 0) {
      setGroups([]);
      hasLoadedOnce.current = true;
      setLoading(false);
      return;
    }

    // Build a map of group_id -> last_read_at for unread detection (O(1) lookup)
    const lastReadMap = new Map<string, string | null>();
    if (hasLastReadAt) {
      for (const p of participantData || []) {
        lastReadMap.set(p.group_id, p.last_read_at ?? null);
      }
    }

    // Fetch group details with participants
    const { data: groupData, error: gErr } = await supabase
      .from('chat_groups')
      .select('*')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (gErr) {
      if (handleAuthError(gErr)) {
        setLoading(false);
        return;
      }
      setError(gErr.message);
      setLoading(false);
      return;
    }

    // Fetch participants for these groups
    const { data: allParticipants } = await supabase
      .from('chat_participants')
      .select('group_id, user_id, users(first_name, last_name, avatar_url)')
      .in('group_id', groupIds);

    // Fetch last message per group — limit to reduce data transfer
    // We fetch recent messages and deduplicate to first-per-group client-side
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('group_id, content, created_at, sender_id')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(groupIds.length * 3); // Fetch a small multiple to ensure coverage

    // Fetch this user's starred group ids. Degrades gracefully if the
    // chat_stars table/policy isn't applied yet (data is null → no stars);
    // we log the error so a missing migration is visible while debugging.
    const { data: starData, error: starErr } = await supabase
      .from('chat_stars')
      .select('group_id')
      .eq('user_id', userId);
    if (starErr) {
      console.warn('[useChatGroups] chat_stars fetch failed (is the 20260613 migration applied?)', starErr.message);
    }
    const starredSet = new Set<string>((starData || []).map((s: any) => s.group_id));

    // Build map of group_id -> latest message (O(n) dedup)
    const lastMessageMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
    if (recentMessages) {
      for (const msg of recentMessages) {
        if (!lastMessageMap.has(msg.group_id)) {
          lastMessageMap.set(msg.group_id, msg);
        }
      }
    }

    const result: ChatGroupWithMeta[] = (groupData || []).map((group) => {
      const participants = (allParticipants || [])
        .filter((p) => p.group_id === group.id && p.users != null)
        .map((p) => ({ user_id: p.user_id, users: p.users as unknown as { first_name: string; last_name: string; avatar_url?: string } }));

      const lastMessage = lastMessageMap.get(group.id);

      // Determine unread status (only if last_read_at column exists)
      // Own messages should never trigger unread indicators
      let hasUnread = false;
      if (hasLastReadAt && lastMessage && lastMessage.sender_id !== userId) {
        const lastReadAt = lastReadMap.get(group.id);
        hasUnread = !lastReadAt || new Date(lastMessage.created_at) > new Date(lastReadAt);
      }

      // Apply optimistic override: if user has opened this group, mark as read
      const optimisticReadGroups = useChatReadStore.getState().readGroups;
      if (optimisticReadGroups.has(group.id)) {
        hasUnread = false;
      }

      return { ...group, participants, lastMessage: lastMessage || undefined, hasUnread, starred: starredSet.has(group.id) };
    });

    // Starred first, then by most-recent activity
    result.sort(compareGroups);

    setGroups(result);
    hasLoadedOnce.current = true;
    setLoading(false);
  }, [userId]);

  // Initial fetch + realtime subscription for live chat list updates
  useEffect(() => {
    if (!userId) return;

    fetchGroups();

    // Subscribe to new messages in any of the user's groups
    // This updates the chat list preview and unread status in real time
    const channel = supabase
      .channel(`chat-list:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only process messages for groups we participate in
          if (!groupIdsRef.current.includes(newMsg.group_id)) return;

          // Surgically update the affected group instead of full refetch
          setGroups((prev) => {
            const idx = prev.findIndex((g) => g.id === newMsg.group_id);
            if (idx === -1) {
              // New group we don't know about yet — trigger full refetch
              fetchGroups();
              return prev;
            }

            const updated = [...prev];
            const group = { ...updated[idx] };
            group.lastMessage = {
              content: newMsg.content,
              created_at: newMsg.created_at,
              sender_id: newMsg.sender_id,
            };

            // Mark unread if from someone else — clear stale optimistic read
            if (newMsg.sender_id !== userId) {
              useChatReadStore.getState().removeReadGroup(group.id);
              group.hasUnread = true;
            }

            updated[idx] = group;

            // Re-sort: starred first, then most recent message bubbles to top
            updated.sort(compareGroups);

            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchGroups]);

  const createGroup = async (name: string | null, participantIds: string[]) => {
    const groupId = await createChatGroup(userId, name, participantIds);
    await fetchGroups();
    return groupId;
  };

  // Star/unstar a chat. Optimistically re-sorts, then persists; reverts on
  // failure (e.g. the chat_stars migration hasn't been applied yet).
  const toggleStar = useCallback(
    async (groupId: string, starred: boolean) => {
      setGroups((prev) => {
        const updated = prev.map((g) => (g.id === groupId ? { ...g, starred } : g));
        updated.sort(compareGroups);
        return updated;
      });

      try {
        if (starred) {
          const { error: insErr } = await supabase
            .from('chat_stars')
            .insert({ user_id: userId, group_id: groupId });
          // 23505 = already starred; treat as success
          if (insErr && insErr.code !== '23505') throw insErr;
        } else {
          const { error: delErr } = await supabase
            .from('chat_stars')
            .delete()
            .eq('user_id', userId)
            .eq('group_id', groupId);
          if (delErr) throw delErr;
        }
      } catch (e) {
        setGroups((prev) => {
          const reverted = prev.map((g) => (g.id === groupId ? { ...g, starred: !starred } : g));
          reverted.sort(compareGroups);
          return reverted;
        });
        console.warn('[useChatGroups] toggleStar failed', e);
      }
    },
    [userId],
  );

  return { groups, loading, error, refetch: fetchGroups, createGroup, toggleStar };
}
