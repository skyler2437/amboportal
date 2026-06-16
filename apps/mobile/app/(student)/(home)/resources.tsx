import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useResources, Resource } from '@/hooks/useResources';
import { ResourceCard } from '@/components/ResourceCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';

export default function StudentResources() {
  const { resources, loading, error, refetch } = useResources();

  if (loading && resources.length === 0) return <LoadingScreen />;
  if (error && resources.length === 0) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={resources}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Resource }) => (
          <ResourceCard
            title={item.title}
            description={item.description}
            fileUrl={item.file_url}
            fileType={item.file_type}
            fileSize={item.file_size}
            createdAt={item.created_at}
          />
        )}
        contentContainerStyle={resources.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="folder-outline" title="No resources" subtitle="Resources will appear here when uploaded" />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  emptyContainer: { flex: 1, padding: 16 },
});
