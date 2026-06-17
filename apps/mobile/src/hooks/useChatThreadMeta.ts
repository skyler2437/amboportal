import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, DEMO_USER, demoChatGroups } from '@/lib/demo';

export interface ChatThreadMeta {
  /** Header title: the group name, or derived from participant names. */
  groupName: string;
  /** Current user's first name (used by the typing indicator). */
  userFirstName: string;
  /** Persist this thread as read (updates chat_participants.last_read_at). */
  markRead: () => void;
}

function useChatThreadMetaReal(groupId: string, userId: string): ChatThreadMeta {
  const [groupName, setGroupName] = useState('Messages');
  const [userFirstName, setUserFirstName] = useState('');

  // Group name for the header (fall back to participant names if unnamed).
  useEffect(() => {
    if (!groupId) return;
    async function fetchGroupName() {
      const { data: group } = await supabase
        .from('chat_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (group?.name) {
        setGroupName(group.name);
        return;
      }

      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id, users(first_name, last_name)')
        .eq('group_id', groupId);

      if (participants) {
        const others = participants
          .filter((p: any) => p.user_id !== userId && p.users)
          .map((p: any) => p.users.first_name);
        if (others.length > 0) {
          setGroupName(others.join(', '));
        }
      }
    }
    fetchGroupName();
  }, [groupId, userId]);

  // Cache the current user's first name for the typing indicator.
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('users')
      .select('first_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) setUserFirstName((data as any).first_name || '');
      });
  }, [userId]);

  const markRead = useCallback(() => {
    if (!groupId || !userId) return;
    Promise.resolve(
      supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .eq('user_id', userId),
    ).catch(() => {});
  }, [groupId, userId]);

  return { groupName, userFirstName, markRead };
}

function useChatThreadMetaDemo(groupId: string, _userId: string): ChatThreadMeta {
  const group = demoChatGroups.find((g) => g.id === groupId);
  return {
    groupName: group?.name || 'Chat',
    userFirstName: DEMO_USER.first_name,
    markRead: () => {},
  };
}

/** Header/typing metadata + read-receipt action for a chat thread. */
export const useChatThreadMeta = DEMO_MODE ? useChatThreadMetaDemo : useChatThreadMetaReal;
