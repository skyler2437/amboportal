import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Submission } from '@ambo/database';
import { DEMO_MODE, demoSubmissions } from '@/lib/demo';

const PAGE_SIZE = 20;

interface SubmissionWithUser extends Submission {
  users?: { first_name: string; last_name: string; email: string };
}

function useSubmissionsReal(userId?: string) {
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);
  const hasFetchedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    setError(null);

    let query = supabase
      .from('submissions')
      .select('*, users(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setSubmissions((data as SubmissionWithUser[]) || []);
      setHasMore((data || []).length === PAGE_SIZE);
    }

    hasFetchedOnce.current = true;
    setInitialLoading(false);
    setRefreshing(false);
  }, [userId]);

  // Pull-to-refresh: shows the RefreshControl spinner
  const refetch = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  // Silent refresh: no spinner, just updates data in-place
  const silentRefresh = useCallback(() => {
    if (hasFetchedOnce.current) {
      // Don't set any loading state — just re-fetch silently
      fetchData();
    }
  }, [fetchData]);

  const fetchMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;

    let query = supabase
      .from('submissions')
      .select('*, users(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .range(submissions.length, submissions.length + PAGE_SIZE - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error: err } = await query;

    if (!err && data) {
      setSubmissions((prev) => [...prev, ...(data as SubmissionWithUser[])]);
      setHasMore(data.length === PAGE_SIZE);
    }
    loadingMoreRef.current = false;
  }, [userId, submissions.length, hasMore]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    submissions,
    loading: initialLoading,
    refreshing,
    error,
    hasMore,
    refetch,
    silentRefresh,
    fetchMore,
  };
}

function useSubmissionsDemo(userId?: string) {
  // Mirror the real hook: a userId (student) sees only their own; admin (no
  // userId) sees everyone.
  const rows = userId ? demoSubmissions.filter((s) => s.user_id === userId) : demoSubmissions;
  return {
    submissions: rows as unknown as SubmissionWithUser[],
    loading: false,
    refreshing: false,
    error: null as string | null,
    hasMore: false,
    refetch: async () => {},
    silentRefresh: () => {},
    fetchMore: async () => {},
  };
}

export const useSubmissions = DEMO_MODE ? useSubmissionsDemo : useSubmissionsReal;
