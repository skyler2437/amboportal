import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useSubmissions } from '@/hooks/useSubmissions';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';
import type { SubmissionStatus } from '@ambo/database';

const FILTERS: SubmissionStatus[] = ['Approved', 'Pending', 'Denied'];

export default function StudentSubmissions() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { submissions, loading, refreshing, error, hasMore, refetch, silentRefresh, fetchMore } =
    useSubmissions(userId);
  const [activeFilters, setActiveFilters] = useState<Set<SubmissionStatus>>(new Set(FILTERS));

  // Silently refresh when the screen regains focus (e.g. after logging activity)
  useFocusEffect(useCallback(() => { silentRefresh(); }, [silentRefresh]));

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

  if (loading && submissions.length === 0) return <LoadingScreen />;
  if (error && submissions.length === 0) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={filtered.length === 0 ? styles.emptyContent : styles.content}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        onEndReached={hasMore ? fetchMore : undefined}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
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
                  <MaterialCommunityIcons name="message-text-outline" size={14} color={tokens.textSecondary} />
                  <Text variant="bodySmall" style={styles.feedbackText} numberOfLines={2}>
                    {item.feedback}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="file-document-outline" title="No submissions" subtitle="Tap 'Log New Activity' on the dashboard to submit your service hours." />
        }
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 32 },
  emptyContent: { flexGrow: 1, padding: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { borderRadius: 16 },
  submissionCard: { marginBottom: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  submissionType: { fontWeight: '600', flex: 1, marginRight: 8 },
  submissionDetails: { flexDirection: 'row', gap: 16 },
  detailText: { color: t.textSecondary },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.divider },
  feedbackText: { color: t.textSecondary, flex: 1 },
});
