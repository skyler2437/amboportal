import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Portal, Dialog, Avatar, Text, Button, ActivityIndicator } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getInitials } from '@/lib/format';
import { type SemanticTokens, space, fontSize } from '@/lib/theme';

export interface DialogUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface UserListDialogProps {
  visible: boolean;
  title: string;
  users: DialogUser[] | null; // null = loading
  onDismiss: () => void;
}

export function UserListDialog({ visible, title, users, onDismiss }: UserListDialogProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          {users === null ? (
            <ActivityIndicator style={{ marginVertical: space.lg }} />
          ) : users.length === 0 ? (
            <Text style={styles.empty}>No one yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              {users.map((u) => {
                const initials = getInitials(u.first_name, u.last_name);
                return (
                  <View key={u.id} style={styles.row}>
                    {u.avatar_url ? (
                      <Avatar.Image size={32} source={{ uri: u.avatar_url }} />
                    ) : (
                      <Avatar.Text size={32} label={initials} style={styles.fallback} labelStyle={{ fontSize: fontSize.xs }} />
                    )}
                    <Text style={styles.name}>{u.first_name} {u.last_name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  fallback: { backgroundColor: t.surfaceVariant },
  name: { fontSize: fontSize.lg },
  empty: { color: t.textMuted, paddingVertical: space.sm },
});
