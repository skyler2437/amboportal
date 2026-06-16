import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, Text, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

export function ChangePasswordCard() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !WEB_URL) {
        Alert.alert('Error', 'Unable to change password. Please try again.');
        setSaving(false);
        return;
      }

      const res = await fetch(`${WEB_URL}/api/mobile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to change password.');
        setSaving(false);
        return;
      }

      Alert.alert('Success', 'Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card elevation={0} style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <MaterialCommunityIcons name="lock-reset" size={24} color={tokens.textPrimary} />
          <View style={styles.headerInfo}>
            <Text variant="bodyLarge" style={styles.title}>Change Password</Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Update your password without needing an email link
            </Text>
          </View>
        </View>

        <TextInput
          mode="outlined"
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={!showCurrent}
          right={
            <TextInput.Icon
              icon={showCurrent ? 'eye-off' : 'eye'}
              onPress={() => setShowCurrent(!showCurrent)}
            />
          }
          dense
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
          right={
            <TextInput.Icon
              icon={showNew ? 'eye-off' : 'eye'}
              onPress={() => setShowNew(!showNew)}
            />
          }
          dense
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showNew}
          dense
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleChangePassword}
          loading={saving}
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          style={styles.button}
        >
          Update Password
        </Button>
      </Card.Content>
    </Card>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  card: { backgroundColor: t.surfaceVariant },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerInfo: { flex: 1 },
  title: { fontWeight: '600' },
  subtitle: { color: t.textSecondary },
  input: { backgroundColor: t.surface, marginBottom: 10 },
  button: { borderRadius: 8, marginTop: 4 },
});
