import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert, Pressable } from 'react-native';
import { TextInput, Button, Text, Avatar, Checkbox, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useChatGroups } from '@/hooks/useChatGroups';
import { supabase } from '@/lib/supabase';

interface UserItem {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
}

export default function StudentNewChat() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { createGroup } = useChatGroups(userId);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .neq('id', userId)
        .order('last_name');
      setUsers((data as UserItem[]) || []);
      setLoadingUsers(false);
    };
    fetchUsers();
  }, [userId]);

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)
    );
  });

  const toggleUser = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (selected.length === 0) {
      Alert.alert('Error', 'Select at least one participant');
      return;
    }
    setCreating(true);
    try {
      const groupId = await createGroup(groupName.trim() || null, selected);
      router.replace(`/(student)/chat/${groupId}`);
    } catch {
      Alert.alert('Error', 'Failed to create chat group');
    } finally {
      setCreating(false);
    }
  };

  const renderUser = ({ item }: { item: UserItem }) => {
    const initials = `${item.first_name?.[0] || ''}${item.last_name?.[0] || ''}`;
    const isSelected = selected.includes(item.id);

    return (
      <Pressable style={styles.userRow} onPress={() => toggleUser(item.id)}>
        <Checkbox status={isSelected ? 'checked' : 'unchecked'} onPress={() => toggleUser(item.id)} uncheckedColor="#9ca3af" />
        {item.avatar_url ? (
          <Avatar.Image size={36} source={{ uri: item.avatar_url }} />
        ) : (
          <Avatar.Text size={36} label={initials} style={styles.avatarFallback} />
        )}
        <View style={styles.userInfo}>
          <Text variant="bodyMedium" style={styles.userName}>{item.first_name} {item.last_name}</Text>
          <Text variant="bodySmall" style={styles.userRole}>{item.role}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          mode="outlined"
          label="Group Name (optional)"
          value={groupName}
          onChangeText={setGroupName}
          dense
          style={styles.nameInput}
        />
        <TextInput
          mode="outlined"
          label="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          dense
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
        />
        {selected.length > 0 && (
          <Text variant="bodySmall" style={styles.selectedCount}>
            {selected.length} selected
          </Text>
        )}
      </View>

      <Divider />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={creating}
          disabled={selected.length === 0 || creating}
          style={styles.createButton}
        >
          Create Chat
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, gap: 8 },
  nameInput: { backgroundColor: '#fff' },
  searchInput: { backgroundColor: '#fff' },
  selectedCount: { color: '#111827', fontWeight: '600' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  avatarFallback: { backgroundColor: '#e5e7eb' },
  userInfo: { flex: 1 },
  userName: { fontWeight: '600' },
  userRole: { color: '#6b7280' },
  listContent: { paddingBottom: 80 },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  createButton: { borderRadius: 8 },
});
