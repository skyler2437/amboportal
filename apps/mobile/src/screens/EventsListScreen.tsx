import React, { useCallback, useRef, useState } from 'react';
import { SectionList, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Chip, Text, FAB } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useEvents } from '@/hooks/useEvents';
import { EventListSkeleton } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getRsvpTint, getDefaultCardTint, type SemanticTokens } from '@/lib/theme';
import { RSVP_ICON, getRsvpDisplay } from '@/lib/rsvp';
import { formatEventDate, formatEventTime } from '@/lib/format';
import type { AppRole } from '@/lib/roles';

type EventFilter = 'upcoming' | 'all' | 'past';

const EMPTY_MESSAGES: Record<EventFilter, string> = {
  upcoming: 'No upcoming events. Tap + to create one.',
  past: 'No past events.',
  all: 'Tap + to create your first event.',
};

/** Events list shared by the admin and student routes. */
export function EventsListScreen({ role }: { role: AppRole }) {
  const { styles, tokens, mode } = useThemedStyles(makeStyles);
  const cardTint = getRsvpTint(mode);
  const defaultCard = getDefaultCardTint(mode);
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { events, loading, error, refetch } = useEvents(userId);
  const router = useRouter();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);

  if (!loading && !initialLoadDone.current) {
    initialLoadDone.current = true;
  }

  // Silent refetch when returning from event detail (picks up RSVP changes)
  useFocusEffect(useCallback(() => {
    if (initialLoadDone.current) {
      refetch();
    }
  }, [refetch]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredEvents = React.useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      if (filter === 'upcoming') return new Date(e.end_time) >= now;
      if (filter === 'past') return new Date(e.end_time) < now;
      return true;
    });
  }, [events, filter]);

  const sections = React.useMemo(() => {
    const grouped: Record<string, typeof filteredEvents> = {};
    for (const event of filteredEvents) {
      const dateKey = new Date(event.start_time).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    }
    const sorted = Object.entries(grouped).sort(([a], [b]) => {
      if (filter === 'past') return b.localeCompare(a);
      return a.localeCompare(b);
    });
    return sorted.map(([date, data]) => ({
      title: formatEventDate(date + 'T12:00:00'),
      data,
    }));
  }, [filteredEvents, filter]);

  if (loading && events.length === 0 && !initialLoadDone.current) return <EventListSkeleton />;
  if (error && events.length === 0) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.filterRow}>
        {(['upcoming', 'all', 'past'] as const).map((f) => (
          <Chip
            key={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            showSelectedOverlay
            style={styles.filterChip}
            compact
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Chip>
        ))}
      </View>
      <SectionList
        contentContainerStyle={styles.content}
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderSectionHeader={({ section }) => (
          <Text variant="titleSmall" style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const counts = item.rsvpCounts;
          const totalGoing = counts?.going || 0;
          const rsvpDisplay = getRsvpDisplay(item);
          const tint = rsvpDisplay ? (cardTint[rsvpDisplay.status as 'going' | 'maybe' | 'no'] || defaultCard) : defaultCard;

          return (
            <Pressable
              onPress={() => router.push({ pathname: `/(${role})/events/[id]`, params: { id: item.id } } as Parameters<typeof router.push>[0])}
            >
              <View style={[styles.eventCard, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                {rsvpDisplay && <View style={[styles.accentStripe, { backgroundColor: tint.accent }]} />}
                <View style={[styles.eventCardInner, rsvpDisplay && styles.eventCardWithAccent]}>
                  <Text variant="titleMedium" style={styles.eventTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.eventMeta}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color={tokens.textSecondary} />
                      <Text variant="bodySmall" style={styles.metaText}>
                        {formatEventTime(item.start_time)} - {formatEventTime(item.end_time)}
                      </Text>
                    </View>
                    {totalGoing > 0 && (
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="account-group-outline" size={14} color={tokens.textSecondary} />
                        <Text variant="bodySmall" style={styles.metaText}>
                          {totalGoing} going
                        </Text>
                      </View>
                    )}
                  </View>
                  {rsvpDisplay && (
                    <View style={styles.myRsvpRow}>
                      <MaterialCommunityIcons
                        name={RSVP_ICON[rsvpDisplay.status] as any || 'check'}
                        size={14}
                        color={tint.accent}
                      />
                      <Text variant="bodySmall" style={[styles.myRsvpText, { color: tint.accent }]}>
                        {rsvpDisplay.label}
                      </Text>
                    </View>
                  )}
                  {item.description && !rsvpDisplay && (
                    <Text variant="bodySmall" style={styles.eventDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="calendar-blank-outline" title="No events" subtitle={EMPTY_MESSAGES[filter]} />
        }
      />

      <FAB
        icon="plus"
        color={tokens.onAccent}
        style={styles.fab}
        onPress={() => router.push(`/(${role})/events/new` as Parameters<typeof router.push>[0])}
        accessibilityLabel="Create new event"
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: t.background },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    filterChip: {},
    content: { padding: 16, paddingBottom: 32 },
    sectionHeader: {
      fontWeight: '600',
      color: t.textPrimary,
      paddingVertical: 8,
      backgroundColor: t.background,
    },
    eventCard: {
      marginBottom: 10,
      borderWidth: 1,
      borderRadius: 12,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    accentStripe: { width: 4 },
    eventCardInner: { flex: 1, padding: 14 },
    eventCardWithAccent: { paddingLeft: 12 },
    eventTitle: { fontWeight: '600', marginBottom: 6 },
    eventMeta: { flexDirection: 'row', gap: 16, marginBottom: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: t.textSecondary },
    myRsvpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    myRsvpText: { fontWeight: '600', fontSize: 12 },
    eventDescription: { color: t.textMuted, marginTop: 2 },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      backgroundColor: t.accentSolid,
      borderRadius: 16,
    },
  });
