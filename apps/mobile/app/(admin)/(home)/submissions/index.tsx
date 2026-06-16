import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSubmissions } from '@/hooks/useSubmissions';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, fontWeight } from '@/lib/theme';
import type { SemanticTokens } from '@/lib/theme';

export default function AdminSubmissions() {
  const { submissions, loading, refreshing, hasMore, refetch, silentRefresh, fetchMore } = useSubmissions();
  const router = useRouter();
  const { styles } = useThemedStyles(makeStyles);

  // Silently refresh data when screen regains focus (no spinner flash)
  useFocusEffect(useCallback(() => { silentRefresh(); }, [silentRefresh]));

  if (loading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={submissions.length === 0 ? styles.emptyContent : styles.content}
      data={submissions}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/(admin)/(home)/submissions/[id]', params: { id: item.id } })}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.studentName}>
                  {item.users ? `${item.users.first_name} ${item.users.last_name}` : 'Unknown'}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text variant="bodySmall" style={styles.serviceType}>{item.service_type}</Text>
              <View style={styles.cardDetails}>
                <Text variant="bodySmall" style={styles.detailText}>{item.service_date}</Text>
                <Text variant="bodySmall" style={styles.detailText}>{Number(item.hours)} hrs</Text>
                <Text variant="bodySmall" style={styles.detailText}>{Number(item.credits)} credits</Text>
              </View>
            </Card.Content>
          </Card>
        </Pressable>
      )}
      onEndReached={hasMore ? fetchMore : undefined}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState icon="file-document-outline" title="No submissions" subtitle="Submissions will appear here." />
      }
    />
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.surface },
  content: { padding: space.lg, paddingBottom: space.xxl },
  emptyContent: { flex: 1, padding: space.lg },
  card: { marginBottom: space.md },
  cardPressed: { opacity: 0.7 },
  cardInner: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  studentName: { fontWeight: fontWeight.bold, flex: 1, marginRight: space.sm },
  serviceType: { color: t.textSecondary, marginBottom: space.sm },
  cardDetails: { flexDirection: 'row', gap: space.lg },
  detailText: { color: t.textMuted },
});
