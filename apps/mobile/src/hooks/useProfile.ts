import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@ambo/database';
import { DEMO_MODE, DEMO_USER } from '@/lib/demo';

function useProfileReal(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, avatar_url')
      .eq('id', userId)
      .single();

    if (err) {
      setError(err.message);
    } else {
      setUser(data as User);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { user, loading, error, refetch: fetch };
}

function useProfileDemo(_userId: string) {
  return {
    user: DEMO_USER as unknown as User,
    loading: false,
    error: null as string | null,
    refetch: async () => {},
  };
}

export const useProfile = DEMO_MODE ? useProfileDemo : useProfileReal;
