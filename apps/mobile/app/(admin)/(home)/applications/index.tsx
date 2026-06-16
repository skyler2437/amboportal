import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, TextInput, Chip, Card, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useApplications, Application, ApplicationStatus } from '@/hooks/useApplications';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getApplicationStatusStyles, space, radius, fontSize, fontWeight } from '@/lib/theme';
import { getInitials } from '@/lib/format';
import type { SemanticTokens } from '@/lib/theme';

const STATUS_FILTERS: ApplicationStatus[] = ['submitted', 'approved', 'rejected', 'draft'];

export default function ApplicationsList() {
  const router = useRouter();
  const { styles, mode } = useThemedStyles(makeStyles);
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
    const initials = getInitials(item.first_name, item.last_name);
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
  header: { backgroundColor: t.surfaceElevated, padding: space.lg, gap: space.md, borderBottomWidth: 1, borderBottomColor: t.border },
  searchInput: { backgroundColor: t.surface },
  filters: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  list: { padding: space.lg },
  emptyContainer: { flex: 1, padding: space.lg },
  card: { marginBottom: space.md },
  cardPressed: { opacity: 0.7 },
  cardInner: { backgroundColor: t.surface },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { backgroundColor: t.surfaceVariant },
  cardInfo: { flex: 1 },
  name: { fontWeight: fontWeight.semibold },
  email: { color: t.textSecondary },
  date: { color: t.textMuted, marginTop: space.xxs },
  statusBadge: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
