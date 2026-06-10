import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { Text, TextInput, Button, Avatar, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface UserItem {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
}

export default function AdminChatEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';

  const [groupName, setGroupName] = useState('');
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [pendingAddIds, setPendingAddIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      setLoading(true);

      // Fetch group name
      const { data: group } = await supabase
        .from('chat_groups')
        .select('name')
        .eq('id', id)
        .single();

      if (group?.name) {
        setGroupName(group.name);
      }

      // Fetch current participants
      const { data: parts } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('group_id', id);

      const currentIds = new Set((parts || []).map((p: any) => p.user_id));
      setParticipantIds(currentIds);

      // Fetch all users
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .order('first_name');

      if (users) {
        setAllUsers(users as UserItem[]);
      }

      setLoading(false);
    }
    fetchData();
  }, [id]);

  const toggleUser = (uid: string) => {
    // Can't toggle users already in the group
    if (participantIds.has(uid)) return;
    setPendingAddIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const isSelected = (uid: string) => participantIds.has(uid) || pendingAddIds.has(uid);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    // Update group name
    const { error: nameError } = await supabase
      .from('chat_groups')
      .update({ name: groupName.trim() || null })
      .eq('id', id);

    if (nameError) {
      setSaving(false);
      Alert.alert('Error', 'Failed to update group name');
      return;
    }

    // Batch-insert new participants
    if (pendingAddIds.size > 0) {
      const inserts = Array.from(pendingAddIds).map((uid) => ({
        group_id: id,
        user_id: uid,
      }));
      const { error: addError } = await supabase
        .from('chat_participants')
        .insert(inserts);

      if (addError) {
        setSaving(false);
        Alert.alert('Error', 'Failed to add participants');
        return;
      }
    }

    setSaving(false);
    router.back();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Sort: current participants first, then others
  const sortedUsers = [...allUsers].sort((a, b) => {
    const aIn = participantIds.has(a.id) ? 0 : 1;
    const bIn = participantIds.has(b.id) ? 0 : 1;
    return aIn - bIn;
  });

  const totalSelected = participantIds.size + pendingAddIds.size;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Group Name Section */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Group Name</Text>
      <TextInput
        mode="outlined"
        value={groupName}
        onChangeText={setGroupName}
        placeholder="Enter group name"
        dense
        style={styles.nameInput}
      />

      <Divider style={styles.divider} />

      {/* Members Section */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Members ({totalSelected})
      </Text>

      {sortedUsers.map((user) => {
        const initials = getInitials(user.first_name, user.last_name);
        const isCurrentParticipant = participantIds.has(user.id);
        const selected = isSelected(user.id);

        return (
          <Pressable
            key={user.id}
            style={[styles.userRow, selected && !isCurrentParticipant && styles.userRowSelected]}
            onPress={() => toggleUser(user.id)}
            disabled={isCurrentParticipant}
          >
            <MaterialCommunityIcons
              name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={selected ? '#005EFF' : '#9ca3af'}
            />
            {user.avatar_url ? (
              <Avatar.Image size={40} source={{ uri: user.avatar_url }} />
            ) : (
              <Avatar.Text size={40} label={initials} style={styles.avatarFallback} />
            )}
            <View style={styles.userInfo}>
              <Text variant="bodyMedium" style={styles.userName}>
                {user.first_name} {user.last_name}
              </Text>
              <Text variant="bodySmall" style={styles.userRole}>
                {user.role}{isCurrentParticipant ? ' · in group' : ''}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Save
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  nameInput: { backgroundColor: '#fff', marginBottom: 8 },
  divider: { marginVertical: 16 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderRadius: 8,
  },
  userRowSelected: {
    backgroundColor: '#f3f4f6',
  },
  avatarFallback: { backgroundColor: '#e5e7eb' },
  userInfo: { flex: 1 },
  userName: { fontWeight: '600' },
  userRole: { color: '#6b7280' },
  footer: { marginTop: 24 },
  saveButton: { borderRadius: 8 },
});
