import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { MemberPickerGrid, MemberUser } from '@/components/MemberPickerGrid';
import { computeMembershipDelta } from '@/lib/membership';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

export default function AdminChatEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  const [groupName, setGroupName] = useState('');
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<MemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      setLoading(true);

      const { data: group } = await supabase
        .from('chat_groups')
        .select('name')
        .eq('id', id)
        .single();
      if (group?.name) setGroupName(group.name);

      const { data: parts } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('group_id', id);
      const ids = (parts || [])
        .map((p: any) => p.user_id as string)
        .filter((uid) => uid !== userId);
      setOriginalIds(ids);
      setSelected(ids);

      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .order('first_name');
      if (users) setAllUsers(users as MemberUser[]);

      setLoading(false);
    }
    fetchData();
  }, [id, userId]);

  const toggleUser = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleSave = async () => {
    if (!id) return;
    if (selected.length === 0) {
      Alert.alert('Error', 'A group needs at least one other member');
      return;
    }
    setSaving(true);

    const { error: nameError } = await supabase
      .from('chat_groups')
      .update({ name: groupName.trim() || null })
      .eq('id', id);
    if (nameError) {
      setSaving(false);
      Alert.alert('Error', 'Failed to update group name');
      return;
    }

    const { added, removed } = computeMembershipDelta(originalIds, selected);

    if (added.length > 0) {
      const inserts = added.map((uid) => ({ group_id: id, user_id: uid }));
      const { error: addError } = await supabase.from('chat_participants').insert(inserts);
      if (addError) {
        setSaving(false);
        Alert.alert('Error', 'Failed to add participants');
        return;
      }
    }

    if (removed.length > 0) {
      const { error: removeError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('group_id', id)
        .in('user_id', removed);
      if (removeError) {
        setSaving(false);
        Alert.alert('Error', 'Failed to remove participants');
        return;
      }
    }

    setSaving(false);
    router.back();
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Group Name</Text>
        <TextInput
          mode="outlined"
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Enter group name"
          dense
          style={styles.nameInput}
        />
      </View>

      <Divider />

      <MemberPickerGrid
        users={allUsers}
        selectedIds={selected}
        onToggle={toggleUser}
        excludeUserId={userId}
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || selected.length === 0}
          style={styles.saveButton}
        >
          Save
        </Button>
      </View>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.surface },
  header: { padding: 16, paddingBottom: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  nameInput: { backgroundColor: t.surface },
  footer: {
    padding: 16,
    backgroundColor: t.surface,
    borderTopWidth: 1,
    borderTopColor: t.border,
  },
  saveButton: { borderRadius: 8 },
});
