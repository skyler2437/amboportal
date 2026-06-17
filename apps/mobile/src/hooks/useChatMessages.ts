import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, demoMessagesByGroup } from '@/lib/demo';

const PAGE_SIZE = 50;

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  status?: MessageStatus;
  like_count?: number;
  liked?: boolean;
  users: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface TypingUser {
  userId: string;
  firstName: string;
}

async function decorateMessageLikes(rows: ChatMessage[]): Promise<ChatMessage[]> {
  const ids = rows.map((m) => m.id).filter((id) => !id.startsWith('optimistic-'));
  if (ids.length === 0) {
    return rows.map((m) => ({ ...m, like_count: m.like_count ?? 0, liked: m.liked ?? false }));
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;

  const { data: likeRows } = await supabase
    .from('chat_message_likes')
    .select('message_id, user_id')
    .in('message_id', ids);

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const r of (likeRows || []) as any[]) {
    counts.set(r.message_id, (counts.get(r.message_id) ?? 0) + 1);
    if (uid && r.user_id === uid) mine.add(r.message_id);
  }
  return rows.map((m) => ({ ...m, like_count: counts.get(m.id) ?? 0, liked: mine.has(m.id) }));
}

function useChatMessagesReal(groupId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Cache the current user's profile so optimistic messages render with real data
  const userProfileRef = useRef<{ first_name: string; last_name: string; avatar_url?: string } | null>(null);
  // Track typing timeout to auto-clear
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial page of messages (most recent PAGE_SIZE)
  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('chat_messages')
      .select('*, users:sender_id(first_name, last_name, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (err) {
      setError(err.message);
    } else {
      const filtered = ((data || []) as ChatMessage[]).filter((m) => m.users != null);
      // Reverse so oldest-first for display
      filtered.reverse();
      const decorated = await decorateMessageLikes(filtered);
      setMessages(decorated);
      setHasOlderMessages(filtered.length >= PAGE_SIZE);
    }
    setLoading(false);
  }, [groupId]);

  // Load older messages (pagination on scroll-up)
  const loadOlderMessages = useCallback(async () => {
    if (!groupId || loadingOlder || !hasOlderMessages || messages.length === 0) return;
    setLoadingOlder(true);

    const oldestMessage = messages[0];
    const { data, error: err } = await supabase
      .from('chat_messages')
      .select('*, users:sender_id(first_name, last_name, avatar_url)')
      .eq('group_id', groupId)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (!err && data) {
      const filtered = ((data || []) as ChatMessage[]).filter((m) => m.users != null);
      filtered.reverse();
      const decorated = await decorateMessageLikes(filtered);
      if (decorated.length < PAGE_SIZE) setHasOlderMessages(false);
      setMessages((prev) => [...decorated, ...prev]);
    }
    setLoadingOlder(false);
  }, [groupId, loadingOlder, hasOlderMessages, messages]);

  // Subscribe to realtime messages + typing presence
  useEffect(() => {
    if (!groupId) return;

    fetchMessages();

    const channel = supabase
      .channel(`chat:${groupId}`, {
        config: { presence: { key: groupId } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;

          // Replace optimistic message or add new one
          setMessages((prev) => {
            // Check if this real message already exists
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // Check for an optimistic message from same sender with same content
            const optimisticIdx = prev.findIndex(
              (m) =>
                m.id.startsWith('optimistic-') &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content
            );

            if (optimisticIdx !== -1) {
              const updated = [...prev];
              const userInfo = prev[optimisticIdx].users || userProfileRef.current;
              updated[optimisticIdx] = {
                ...newMsg,
                users: userInfo,
                status: 'sent' as MessageStatus,
              } as ChatMessage;
              return updated;
            }

            return prev; // Will be added by the async fetch below
          });

          // Fetch the full message with user info
          const { data } = await supabase
            .from('chat_messages')
            .select('*, users:sender_id(first_name, last_name, avatar_url)')
            .eq('id', newMsg.id)
            .single();

          if (data && (data as ChatMessage).users != null) {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === data.id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...(data as ChatMessage), status: 'sent' };
                return updated;
              }
              return [...prev, { ...(data as ChatMessage), status: 'sent' }];
            });
          }
        }
      )
      // Typing presence
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typers: TypingUser[] = [];
        for (const key of Object.keys(state)) {
          for (const presence of state[key]) {
            const p = presence as any;
            if (p.typing) {
              typers.push({ userId: p.userId, firstName: p.firstName });
            }
          }
        }
        setTypingUsers(typers);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_message_likes' },
        async (payload) => {
          const row = (payload.new ?? payload.old) as { message_id?: string; user_id?: string } | null;
          const messageId = row?.message_id;
          if (!messageId) return;
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user?.id;
          // Our own toggle is already applied optimistically — skip self events
          // to avoid double counting.
          if (row?.user_id && uid && row.user_id === uid) return;
          const delta = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
          if (delta === 0) return;
          setMessages((prev) =>
            prev.some((m) => m.id === messageId)
              ? prev.map((m) =>
                  m.id === messageId ? { ...m, like_count: Math.max(0, (m.like_count ?? 0) + delta) } : m
                )
              : prev
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [groupId, fetchMessages]);

  // Broadcast typing status
  const sendTyping = useCallback(
    (userId: string, firstName: string) => {
      if (!channelRef.current) return;
      channelRef.current.track({
        userId,
        firstName,
        typing: true,
      });

      // Auto-clear typing after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          userId,
          firstName,
          typing: false,
        });
      }, 3000);
    },
    []
  );

  const stopTyping = useCallback(
    (userId: string, firstName: string) => {
      if (!channelRef.current) return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      channelRef.current.track({
        userId,
        firstName,
        typing: false,
      });
    },
    []
  );

  const sendMessage = async (senderId: string, content: string) => {
    // Stop typing indicator
    const profile = userProfileRef.current;
    if (profile) {
      stopTyping(senderId, profile.first_name);
    }

    // Cache user profile for optimistic rendering
    if (!userProfileRef.current) {
      const { data: profileData } = await supabase
        .from('users')
        .select('first_name, last_name, avatar_url')
        .eq('id', senderId)
        .single();
      if (profileData) {
        userProfileRef.current = profileData as { first_name: string; last_name: string; avatar_url?: string };
      }
    }

    const optimisticId = `optimistic-${Date.now()}`;
    // Optimistically add message with 'sending' status
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      group_id: groupId,
      sender_id: senderId,
      content,
      created_at: new Date().toISOString(),
      status: 'sending',
      users: userProfileRef.current || { first_name: '', last_name: '' },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Insert — realtime subscription will replace optimistic with real message
    const { error: err } = await supabase
      .from('chat_messages')
      .insert({ group_id: groupId, sender_id: senderId, content });

    if (err) {
      // Mark as failed instead of removing — user can retry
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, status: 'failed' as MessageStatus } : m))
      );
      throw err;
    }
  };

  // Retry a failed message
  const retryMessage = async (messageId: string, senderId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.status !== 'failed') return;

    // Update to sending
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: 'sending' as MessageStatus } : m))
    );

    const { error: err } = await supabase
      .from('chat_messages')
      .insert({ group_id: groupId, sender_id: senderId, content: msg.content });

    if (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'failed' as MessageStatus } : m))
      );
    } else {
      // Remove the failed optimistic message — realtime will add the real one
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const toggleMessageLike = async (messageId: string) => {
    if (messageId.startsWith('optimistic-')) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;

    let nowLiked = false;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        nowLiked = !m.liked;
        return { ...m, liked: nowLiked, like_count: (m.like_count ?? 0) + (nowLiked ? 1 : -1) };
      })
    );

    try {
      if (nowLiked) {
        const { error: err } = await supabase
          .from('chat_message_likes')
          .insert({ message_id: messageId, user_id: uid });
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('chat_message_likes')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', uid);
        if (err) throw err;
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, liked: !nowLiked, like_count: (m.like_count ?? 0) + (nowLiked ? -1 : 1) }
            : m
        )
      );
    }
  };

  // Keep a ref of the latest messages so refreshLikes can read them without
  // being recreated on every message change.
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Re-sync like_count/liked for the loaded messages from the server. Called on
  // screen focus to reconcile realtime delta drift (e.g. like events missed
  // while the app was backgrounded). Does NOT refetch message bodies or change
  // order — it only updates the like fields on messages already in state.
  const refreshLikes = useCallback(async () => {
    const current = messagesRef.current;
    if (current.length === 0) return;
    const decorated = await decorateMessageLikes(current);
    const byId = new Map(decorated.map((m) => [m.id, m] as const));
    setMessages((prev) =>
      prev.map((m) => {
        const d = byId.get(m.id);
        return d ? { ...m, like_count: d.like_count, liked: d.liked } : m;
      })
    );
  }, []);

  return {
    messages,
    toggleMessageLike,
    refreshLikes,
    loading,
    loadingOlder,
    hasOlderMessages,
    error,
    typingUsers,
    refetch: fetchMessages,
    sendMessage,
    retryMessage,
    loadOlderMessages,
    sendTyping,
    stopTyping,
  };
}

function useChatMessagesDemo(groupId: string) {
  return {
    messages: (demoMessagesByGroup[groupId] ?? []) as ChatMessage[],
    toggleMessageLike: async (_messageId: string) => {},
    refreshLikes: async () => {},
    loading: false,
    loadingOlder: false,
    hasOlderMessages: false,
    error: null as string | null,
    typingUsers: [] as TypingUser[],
    refetch: async () => {},
    sendMessage: async (_senderId: string, _content: string) => {},
    retryMessage: async (_messageId: string, _senderId: string) => {},
    loadOlderMessages: async () => {},
    sendTyping: (_userId: string, _firstName: string) => {},
    stopTyping: (_userId: string, _firstName: string) => {},
  };
}

export const useChatMessages = DEMO_MODE ? useChatMessagesDemo : useChatMessagesReal;
