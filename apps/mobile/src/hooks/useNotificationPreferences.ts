import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, demoNotificationPrefs } from '@/lib/demo';

export interface NotificationPreferences {
  chat_messages: boolean;
  new_posts: boolean;
  post_comments: boolean;
  event_comments: boolean;
  event_reminders: boolean;
}

const DEFAULTS: NotificationPreferences = {
  chat_messages: true,
  new_posts: true,
  post_comments: true,
  event_comments: true,
  event_reminders: true,
};

function useNotificationPreferencesReal(userId: string) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data } = await supabase
      .from('notification_preferences')
      .select('chat_messages, new_posts, post_comments, event_comments, event_reminders')
      .eq('user_id', userId)
      .single();

    if (data) {
      setPrefs({
        chat_messages: data.chat_messages ?? true,
        new_posts: data.new_posts ?? true,
        post_comments: data.post_comments ?? true,
        event_comments: data.event_comments ?? true,
        event_reminders: data.event_reminders ?? true,
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const updatePref = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);

      await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: userId, ...updated, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    },
    [userId, prefs]
  );

  return { prefs, loading, updatePref, refetch: fetchPrefs };
}

function useNotificationPreferencesDemo(_userId: string) {
  return {
    prefs: demoNotificationPrefs as NotificationPreferences,
    loading: false,
    updatePref: async (_key: keyof NotificationPreferences, _value: boolean) => {},
    refetch: async () => {},
  };
}

export const useNotificationPreferences = DEMO_MODE
  ? useNotificationPreferencesDemo
  : useNotificationPreferencesReal;
