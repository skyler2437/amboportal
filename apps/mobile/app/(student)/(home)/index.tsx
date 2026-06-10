import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Card, Text, Button, Chip, Divider } from 'react-native-paper';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useSubmissions } from '@/hooks/useSubmissions';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { hapticMedium } from '@/lib/haptics';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { CheddarRain } from '@/components/CheddarRain';
import type { SubmissionStatus } from '@ambo/database';

const FILTERS: SubmissionStatus[] = ['Approved', 'Pending', 'Denied'];

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
}

export default function StudentDashboard() {
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { submissions, loading, error, refetch } = useSubmissions(userId);
  const [activeFilters, setActiveFilters] = useState<Set<SubmissionStatus>>(new Set(FILTERS));
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cheddarActive, setCheddarActive] = useState(false);
  const initialLoadDone = useRef(false);
  const router = useRouter();

  if (!loading && !initialLoadDone.current) {
    initialLoadDone.current = true;
  }

  const fetchUpcoming = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, start_time')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);
    setUpcomingEvents((data as UpcomingEvent[]) || []);
  }, []);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  // Silent refetch when screen regains focus (e.g. after submitting activity)
  useFocusEffect(useCallback(() => {
    if (initialLoadDone.current) {
      refetch();
      fetchUpcoming();
    }
  }, [refetch, fetchUpcoming]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), fetchUpcoming()]);
    hapticMedium();
    setRefreshing(false);
  }, [refetch, fetchUpcoming]);

  const stats = useMemo(() => {
    const approved = submissions.filter((s) => s.status === 'Approved');
    const totalHours = approved.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
    const totalCredits = approved.reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
    const pending = submissions.filter((s) => s.status === 'Pending').length;
    return { totalHours, totalCredits, pending };
  }, [submissions]);

  const filtered = useMemo(
    () => submissions.filter((s) => activeFilters.has(s.status)),
    [submissions, activeFilters]
  );

  const toggleFilter = (status: SubmissionStatus) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  if (loading && submissions.length === 0 && !initialLoadDone.current) return <DashboardSkeleton />;
  if (error && submissions.length === 0) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => setCheddarActive(true)}
              disabled={cheddarActive}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Make it rain cheddar"
            >
              <Text style={styles.cheddarEmoji}>🧀</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
      style={styles.flex}
      contentContainerStyle={styles.content}
      data={filtered}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListHeaderComponent={
        <View style={styles.header}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text variant="headlineMedium" style={styles.statValue}>
                {stats.totalHours.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Approved{'\n'}Hours</Text>
            </View>
            <View style={styles.statCard}>
              <Text variant="headlineMedium" style={styles.statValue}>
                {stats.totalCredits.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Credits</Text>
            </View>
            {stats.pending > 0 && (
              <View style={[styles.statCard, styles.pendingCard]}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.pending}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>Pending</Text>
              </View>
            )}
          </View>

          {/* Quick Action */}
          <Button
            mode="contained"
            icon="plus-circle-outline"
            onPress={() => router.push('/(student)/new-submission')}
            style={styles.actionButton}
          >
            Log New Activity
          </Button>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Upcoming Events</Text>
                <Pressable onPress={() => router.push('/(student)/events')}>
                  <Text variant="bodySmall" style={styles.seeAllText}>See All</Text>
                </Pressable>
              </View>
              {upcomingEvents.map((event) => {
                const d = new Date(event.start_time);
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => router.push({ pathname: '/(student)/events/[id]', params: { id: event.id } })}
                  >
                    <Card elevation={0} style={styles.eventCard}>
                      <Card.Content style={styles.eventContent}>
                        <View style={styles.eventDate}>
                          <Text variant="labelLarge" style={styles.eventMonth}>
                            {d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                          </Text>
                          <Text variant="headlineSmall" style={styles.eventDay}>
                            {d.getDate()}
                          </Text>
                        </View>
                        <View style={styles.eventInfo}>
                          <Text variant="bodyMedium" style={styles.eventTitle} numberOfLines={1}>
                            {event.title}
                          </Text>
                          <View style={styles.eventMeta}>
                            <MaterialCommunityIcons name="clock-outline" size={14} color="#6b7280" />
                            <Text variant="bodySmall" style={styles.eventMetaText}>
                              {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </Text>
                          </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
                      </Card.Content>
                    </Card>
                  </Pressable>
                );
              })}
            </>
          )}

          <Divider style={styles.divider} />

          {/* Filters */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Recent Submissions</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((status) => (
              <Chip
                key={status}
                selected={activeFilters.has(status)}
                onPress={() => toggleFilter(status)}
                style={styles.chip}
                compact
              >
                {status}
              </Chip>
            ))}
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Card elevation={0} style={styles.submissionCard}>
          <Card.Content>
            <View style={styles.submissionHeader}>
              <Text variant="bodyMedium" style={styles.submissionType}>{item.service_type}</Text>
              <StatusBadge status={item.status} />
            </View>
            <View style={styles.submissionDetails}>
              <Text variant="bodySmall" style={styles.detailText}>
                {new Date(item.service_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '')}
              </Text>
              <Text variant="bodySmall" style={styles.detailText}>
                {Number(item.hours)} hrs
              </Text>
              <Text variant="bodySmall" style={styles.detailText}>
                {Number(item.credits)} credits
              </Text>
            </View>
            {item.feedback && (
              <View style={styles.feedbackRow}>
                <MaterialCommunityIcons name="message-text-outline" size={14} color="#6b7280" />
                <Text variant="bodySmall" style={styles.feedbackText} numberOfLines={2}>
                  {item.feedback}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
      ListEmptyComponent={
        <EmptyState icon="file-document-outline" title="No submissions yet" subtitle="Tap 'Log New Activity' to submit your first service hours." />
      }
      />
      <CheddarRain isActive={cheddarActive} onComplete={() => setCheddarActive(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  cheddarEmoji: { fontSize: 20, marginRight: 4 },
  content: { padding: 16, paddingBottom: 32 },
  header: { gap: 16, marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 16, overflow: 'hidden' },
  pendingCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statValue: { fontWeight: '700' },
  statLabel: { color: '#6b7280' },
  actionButton: { borderRadius: 12 },
  divider: { marginVertical: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: '600' },
  seeAllText: { color: '#3b82f6', fontWeight: '500' },
  eventCard: { marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  eventContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventDate: { alignItems: 'center', width: 44 },
  eventMonth: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  eventDay: { fontWeight: '700', color: '#111827', lineHeight: 28 },
  eventInfo: { flex: 1 },
  eventTitle: { fontWeight: '600', marginBottom: 4 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText: { color: '#6b7280' },
  filterRow: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 16 },
  submissionCard: { marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  submissionType: { fontWeight: '600', flex: 1, marginRight: 8 },
  submissionDetails: { flexDirection: 'row', gap: 16 },
  detailText: { color: '#6b7280' },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  feedbackText: { color: '#6b7280', flex: 1 },
});
