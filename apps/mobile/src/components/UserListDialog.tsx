import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Portal, Dialog, Avatar, Text, Button, ActivityIndicator } from 'react-native-paper';

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
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          {users === null ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : users.length === 0 ? (
            <Text style={styles.empty}>No one yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              {users.map((u) => {
                const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`;
                return (
                  <View key={u.id} style={styles.row}>
                    {u.avatar_url ? (
                      <Avatar.Image size={32} source={{ uri: u.avatar_url }} />
                    ) : (
                      <Avatar.Text size={32} label={initials} style={styles.fallback} labelStyle={{ fontSize: 12 }} />
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  fallback: { backgroundColor: '#e5e7eb' },
  name: { fontSize: 15 },
  empty: { color: '#9ca3af', paddingVertical: 8 },
});
