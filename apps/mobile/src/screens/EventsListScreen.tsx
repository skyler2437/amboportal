import React, { useState } from 'react';
import { SectionList, View, StyleSheet, Pressable } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useEvents } from '@/hooks/useEvents';
import { EventListSkeleton } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Fab } from '@/components/ui';
import { useListScreen } from '@/hooks/useListScreen';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getRsvpTint, getDefaultCardTint, space, radius, fontSize, fontWeight, type SemanticTokens } from '@/lib/theme';
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
  const { isInitialLoading, listError, refreshControl } = useListScreen({ data: events, loading, error, refetch });

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

  if (isInitialLoading) return <EventListSkeleton />;
  if (listError) return <ErrorState message={listError} onRetry={refetch} />;

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
        refreshControl={refreshControl}
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

      <Fab
        icon="plus"
        label="Create new event"
        onPress={() => router.push(`/(${role})/events/new` as Parameters<typeof router.push>[0])}
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: t.background },
    filterRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
    filterChip: {},
    content: { padding: space.lg, paddingBottom: space.xxl },
    sectionHeader: {
      fontWeight: fontWeight.semibold,
      color: t.textPrimary,
      paddingVertical: space.sm,
      backgroundColor: t.background,
    },
    eventCard: {
      marginBottom: space.md,
      borderWidth: 1,
      borderRadius: radius.md,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    accentStripe: { width: 4 },
    eventCardInner: { flex: 1, padding: space.lg },
    eventCardWithAccent: { paddingLeft: space.md },
    eventTitle: { fontWeight: fontWeight.semibold, marginBottom: space.sm },
    eventMeta: { flexDirection: 'row', gap: space.lg, marginBottom: space.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    metaText: { color: t.textSecondary },
    myRsvpRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
    myRsvpText: { fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
    eventDescription: { color: t.textMuted, marginTop: space.xxs },
  });
