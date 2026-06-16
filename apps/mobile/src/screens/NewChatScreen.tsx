import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useChatGroups } from '@/hooks/useChatGroups';
import { supabase } from '@/lib/supabase';
import { MemberPickerGrid, MemberUser } from '@/components/MemberPickerGrid';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';
import type { AppRole } from '@/lib/roles';

/**
 * New-chat screen body shared by the admin and student routes. The only
 * role-specific difference is the post-create navigation target.
 */
export function NewChatScreen({ role }: { role: AppRole }) {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { createGroup } = useChatGroups(userId);
  const { styles } = useThemedStyles(makeStyles);
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .neq('id', userId)
        .order('last_name');
      setUsers((data as MemberUser[]) || []);
    };
    fetchUsers();
  }, [userId]);

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
      router.replace(`/(${role})/chat/${groupId}` as Parameters<typeof router.replace>[0]);
    } catch {
      Alert.alert('Error', 'Failed to create chat group');
    } finally {
      setCreating(false);
    }
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
      </View>

      <Divider />

      <MemberPickerGrid users={users} selectedIds={selected} onToggle={toggleUser} />

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

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.surface },
    header: { padding: 16, paddingBottom: 8 },
    nameInput: { backgroundColor: t.surface },
    footer: {
      padding: 16,
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    createButton: { borderRadius: 8 },
  });
