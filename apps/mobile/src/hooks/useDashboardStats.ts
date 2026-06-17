import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, demoAdminCounts, demoUpcomingEvents, demoResources } from '@/lib/demo';

// --- Admin dashboard counts ---------------------------------------------------

export interface AdminDashboardStats {
  pendingCount: number;
  userCount: number;
  applicationCount: number;
  submissionCount: number;
  /** True once the first fetch resolves (gates the loading spinner). */
  loaded: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

function useAdminDashboardStatsReal(): AdminDashboardStats {
  const [pendingCount, setPendingCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    const [pendingRes, usersRes, applicationsRes, submissionsRes] = await Promise.all([
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('submissions').select('id', { count: 'exact', head: true }),
    ]);
    setPendingCount(pendingRes.count || 0);
    setUserCount(usersRes.count || 0);
    setApplicationCount(applicationsRes.count || 0);
    setSubmissionCount(submissionsRes.count || 0);
    setLoaded(true);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  // Refetch when the screen comes back into focus.
  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  return { pendingCount, userCount, applicationCount, submissionCount, loaded, refreshing, onRefresh };
}

function useAdminDashboardStatsDemo(): AdminDashboardStats {
  return { ...demoAdminCounts, loaded: true, refreshing: false, onRefresh: async () => {} };
}

export const useAdminDashboardStats = DEMO_MODE ? useAdminDashboardStatsDemo : useAdminDashboardStatsReal;

// --- Student dashboard (upcoming events + resource count) ---------------------

export interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
}

export interface StudentDashboardStats {
  upcomingEvents: UpcomingEvent[];
  resourceCount: number;
  /** Refetch both (the screen coordinates this with its submissions refetch). */
  refresh: () => Promise<void>;
}

function useStudentDashboardStatsReal(): StudentDashboardStats {
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [resourceCount, setResourceCount] = useState(0);

  const fetchUpcoming = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, start_time')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);
    setUpcomingEvents((data as UpcomingEvent[]) || []);
  }, []);

  const fetchResourceCount = useCallback(async () => {
    const { count } = await supabase
      .from('resources')
      .select('id', { count: 'exact', head: true });
    setResourceCount(count || 0);
  }, []);

  useEffect(() => {
    fetchUpcoming();
    fetchResourceCount();
  }, [fetchUpcoming, fetchResourceCount]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchUpcoming(), fetchResourceCount()]);
  }, [fetchUpcoming, fetchResourceCount]);

  return { upcomingEvents, resourceCount, refresh };
}

function useStudentDashboardStatsDemo(): StudentDashboardStats {
  return {
    upcomingEvents: demoUpcomingEvents,
    resourceCount: demoResources.length,
    refresh: async () => {},
  };
}

export const useStudentDashboardStats = DEMO_MODE ? useStudentDashboardStatsDemo : useStudentDashboardStatsReal;
