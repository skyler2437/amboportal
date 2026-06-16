import React from 'react';
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Card, Text, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useUsers } from '@/hooks/useUsers';
import { RoleBadge } from '@/components/RoleBadge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';

export default function AdminUsers() {
  const { users, loading, refetch } = useUsers();
  const router = useRouter();

  if (loading && users.length === 0) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={users}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      renderItem={({ item }) => {
        const initials = `${item.first_name?.[0] || ''}${item.last_name?.[0] || ''}`;
        return (
          <Pressable
            onPress={() => router.push({ pathname: '/(admin)/users/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Card elevation={0} style={styles.cardInner}>
              <Card.Content style={styles.cardContent}>
                {item.avatar_url ? (
                  <Avatar.Image size={40} source={{ uri: item.avatar_url }} />
                ) : (
                  <Avatar.Text size={40} label={initials} style={styles.avatar} />
                )}
                <View style={styles.cardInfo}>
                  <Text variant="bodyLarge" style={styles.name}>
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.email}>{item.email}</Text>
                </View>
                <RoleBadge role={item.role} />
              </Card.Content>
            </Card>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <EmptyState icon="account-group-outline" title="No users" subtitle="Users will appear here." />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 8 },
  cardPressed: { opacity: 0.7 },
  cardInner: { backgroundColor: '#fff' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { backgroundColor: '#e5e7eb' },
  cardInfo: { flex: 1 },
  name: { fontWeight: '600' },
  email: { color: '#6b7280' },
});
