import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, TextInput, Chip, Card, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useApplications, Application, ApplicationStatus } from '@/hooks/useApplications';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { useAppTheme } from '@/lib/ThemeProvider';
import { getApplicationStatusStyles } from '@/lib/theme';
import type { SemanticTokens } from '@/lib/theme';

const STATUS_FILTERS: ApplicationStatus[] = ['submitted', 'approved', 'rejected', 'draft'];

export default function ApplicationsList() {
  const router = useRouter();
  const { tokens, mode } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const statusStyles = getApplicationStatusStyles(mode);
  const { applications, loading, refetch } = useApplications();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(null);

  const filtered = useMemo(() => {
    let result = applications;
    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.first_name?.toLowerCase().includes(q) ||
          a.last_name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.phone_number?.includes(q)
      );
    }
    return result;
  }, [applications, searchQuery, statusFilter]);

  if (loading && applications.length === 0) return <LoadingScreen />;

  const renderApplication = ({ item }: { item: Application }) => {
    const initials = `${item.first_name?.[0] || ''}${item.last_name?.[0] || ''}`;
    const colors = statusStyles[item.status] || statusStyles.draft;
    const date = new Date(item.created_at).toLocaleDateString();

    return (
      <Pressable
        onPress={() => router.push(`/(admin)/(home)/applications/${item.id}`)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <Card elevation={0} style={styles.cardInner}>
          <Card.Content style={styles.cardContent}>
            <Avatar.Text size={40} label={initials} style={styles.avatar} />
            <View style={styles.cardInfo}>
              <Text variant="bodyLarge" style={styles.name}>
                {item.first_name} {item.last_name}
              </Text>
              <Text variant="bodySmall" style={styles.email}>{item.email}</Text>
              <Text variant="bodySmall" style={styles.date}>{date}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          mode="outlined"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          dense
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
        />
        <View style={styles.filters}>
          <Chip
            selected={statusFilter === null}
            onPress={() => setStatusFilter(null)}
            compact
          >
            All
          </Chip>
          {STATUS_FILTERS.map((status) => (
            <Chip
              key={status}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(statusFilter === status ? null : status)}
              compact
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Chip>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="file-document-outline" title="No applications" subtitle="No applications match your search" />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { backgroundColor: t.surfaceElevated, padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: t.border },
  searchInput: { backgroundColor: t.surface },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  list: { padding: 16 },
  emptyContainer: { flex: 1, padding: 16 },
  card: { marginBottom: 10 },
  cardPressed: { opacity: 0.7 },
  cardInner: { backgroundColor: t.surface },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { backgroundColor: t.surfaceVariant },
  cardInfo: { flex: 1 },
  name: { fontWeight: '600' },
  email: { color: t.textSecondary },
  date: { color: t.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
});
