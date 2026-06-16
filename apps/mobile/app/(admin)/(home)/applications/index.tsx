import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, TextInput, Chip, Card, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useApplications, Application, ApplicationStatus } from '@/hooks/useApplications';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';

const STATUS_FILTERS: ApplicationStatus[] = ['submitted', 'approved', 'rejected', 'draft'];

const statusStyles: Record<ApplicationStatus, { bg: string; text: string }> = {
  submitted: { bg: '#eff6ff', text: '#3b82f6' },
  approved: { bg: '#ecfdf5', text: '#10b981' },
  rejected: { bg: '#fef2f2', text: '#ef4444' },
  draft: { bg: '#f5f5f5', text: '#6b7280' },
};

export default function ApplicationsList() {
  const router = useRouter();
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
        onPress={() => router.push(`/(admin)/applications/${item.id}`)}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchInput: { backgroundColor: '#fff' },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  list: { padding: 16 },
  emptyContainer: { flex: 1, padding: 16 },
  card: { marginBottom: 10 },
  cardPressed: { opacity: 0.7 },
  cardInner: { backgroundColor: '#fff' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { backgroundColor: '#e5e7eb' },
  cardInfo: { flex: 1 },
  name: { fontWeight: '600' },
  email: { color: '#6b7280' },
  date: { color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
});
