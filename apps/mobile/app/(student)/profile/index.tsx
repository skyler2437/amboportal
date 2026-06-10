import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Platform, Pressable, ActionSheetIOS, Share } from 'react-native';
import { Card, Text, Button, Divider, TextInput, Switch, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { RoleBadge } from '@/components/RoleBadge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AvatarUpload } from '@/components/AvatarUpload';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import { hapticSuccess, hapticError, hapticWarning } from '@/lib/haptics';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { openExternalLink } from '@/lib/openExternalLink';

export default function StudentProfile() {
  const { session, signOut } = useAuth();
  const userId = session?.user?.id || '';
  const { user, loading, refetch } = useProfile(userId);
  const { permissionStatus, loading: pushLoading, requestPermission } = usePushNotifications(userId);
  const { prefs, loading: prefsLoading, updatePref } = useNotificationPreferences(userId);
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, toggle: toggleBiometric } = useBiometricLock();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const changed =
      firstName !== (user.first_name || '') ||
      lastName !== (user.last_name || '') ||
      email !== (user.email || '') ||
      phone !== (user.phone || '');
    setHasChanges(changed);
  }, [firstName, lastName, email, phone, user]);

  const handleSave = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!firstName.trim()) {
      Alert.alert('Invalid Name', 'First name is required.');
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      Alert.alert('Invalid Phone', 'Phone number must be exactly 10 digits.');
      return;
    }

    setSaving(true);

    const emailChanged = email.trim().toLowerCase() !== user?.email;

    // Update non-email fields via Supabase client
    const { error } = await supabase
      .from('users')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      })
      .eq('id', userId);

    // Email changes go through a server-side endpoint that atomically
    // updates both auth.users and public.users using the admin client
    // (bypasses RLS and the broken confirmation-link flow).
    if (!error && emailChanged) {
      const baseUrl = process.env.EXPO_PUBLIC_WEB_URL;
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!baseUrl || !currentSession?.access_token) {
        setSaving(false);
        hapticError();
        Alert.alert('Error', 'Unable to update email. Please try again.');
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/api/mobile/update-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSaving(false);
          hapticError();
          Alert.alert('Email Update Failed', data.error || 'Please try again.');
          return;
        }
      } catch (err: any) {
        setSaving(false);
        hapticError();
        Alert.alert('Email Update Failed', err.message || 'Please try again.');
        return;
      }
    }

    setSaving(false);
    if (error) {
      hapticError();
      Alert.alert('Error', error.message);
    } else {
      hapticSuccess();
      Alert.alert('Success', 'Profile updated.');
      refetch();
    }
  };

  const handleDeleteAccount = useCallback(() => {
    hapticWarning();
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data including submissions, posts, comments, and messages. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              const accessToken = currentSession?.access_token;
              if (!accessToken) {
                Alert.alert('Error', 'You must be signed in to delete your account.');
                setDeleting(false);
                return;
              }

              const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
              if (!baseUrl) {
                Alert.alert('Error', 'Server URL is not configured.');
                setDeleting(false);
                return;
              }

              const res = await fetch(`${baseUrl}/api/mobile/delete-account`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
              });

              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to delete account');
              }

              // Sign out after successful deletion
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handleSubscribeCalendar = () => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://ambo-portal.vercel.app';
    const feedUrl = `${webUrl}/api/calendar/feed`;
    const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');
    const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;

    const copyLink = async () => {
      await Share.share({ message: feedUrl, title: 'AmboPortal Calendar Feed' });
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Apple Calendar', 'Google Calendar', 'Share Link'],
          cancelButtonIndex: 0,
          title: 'Subscribe to Calendar',
          message: 'Choose your calendar app to subscribe to ambassador events.',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) Linking.openURL(webcalUrl);
          else if (buttonIndex === 2) Linking.openURL(googleUrl);
          else if (buttonIndex === 3) copyLink();
        }
      );
    } else {
      Alert.alert('Subscribe to Calendar', 'Choose your calendar app', [
        { text: 'Google Calendar', onPress: () => Linking.openURL(googleUrl) },
        { text: 'Share Link', onPress: copyLink },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  if (loading) return <LoadingScreen />;

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
    : '?';

  const displayAvatar = avatarUrl || user?.avatar_url;
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Avatar & Name */}
      <View style={styles.avatarSection}>
        <AvatarUpload
          userId={userId}
          avatarUrl={displayAvatar}
          initials={initials}
          onUploaded={(url) => { setAvatarUrl(url); refetch(); }}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.first_name} {user?.last_name}
        </Text>
        {user?.role && <RoleBadge role={user.role} />}
      </View>

      <Divider style={styles.divider} />

      {/* Editable Profile Fields */}
      <Text variant="titleSmall" style={styles.sectionLabel}>PROFILE INFORMATION</Text>
      <View style={styles.formSection}>
        <TextInput
          mode="outlined"
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          dense
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          dense
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          dense
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Phone (10 digits)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10}
          dense
          style={styles.input}
        />
        {hasChanges && (
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Push Notifications */}
      <Text variant="titleSmall" style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <Card elevation={0} style={styles.pushCard}>
        <Card.Content>
          <View style={styles.pushHeader}>
            <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#111827" />
            <View style={styles.pushInfo}>
              <Text variant="bodyLarge" style={styles.pushTitle}>Push Notifications</Text>
              <Text variant="bodySmall" style={styles.pushSubtitle}>
                {permissionStatus === 'granted'
                  ? 'Notifications are enabled'
                  : permissionStatus === 'denied'
                  ? 'Notifications are blocked in device settings'
                  : 'Enable to receive alerts for messages and events'}
              </Text>
            </View>
          </View>
          {pushLoading ? (
            <ActivityIndicator style={styles.pushLoader} />
          ) : permissionStatus === 'granted' ? (
            <View style={styles.pushStatus}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
              <Text variant="bodySmall" style={styles.pushStatusText}>Enabled</Text>
            </View>
          ) : permissionStatus === 'denied' ? (
            <Button
              mode="outlined"
              icon="cog"
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }}
              compact
            >
              Open Settings
            </Button>
          ) : (
            <Button
              mode="contained"
              icon="bell"
              onPress={requestPermission}
              style={styles.pushEnableButton}
            >
              Enable Notifications
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Notification Preferences */}
      <Text variant="titleSmall" style={styles.prefsLabel}>Notification Types</Text>
      <Card elevation={0} style={styles.prefsCard}>
        <Card.Content style={styles.prefsContent}>
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <MaterialCommunityIcons name="chat-outline" size={20} color="#6b7280" />
              <Text variant="bodyMedium">Chat Messages</Text>
            </View>
            <Switch
              value={prefs.chat_messages}
              onValueChange={(v) => updatePref('chat_messages', v)}
            />
          </View>
          <Divider />
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color="#6b7280" />
              <Text variant="bodyMedium">New Posts</Text>
            </View>
            <Switch
              value={prefs.new_posts}
              onValueChange={(v) => updatePref('new_posts', v)}
            />
          </View>
          <Divider />
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <MaterialCommunityIcons name="comment-text-outline" size={20} color="#6b7280" />
              <Text variant="bodyMedium">Comments on My Posts</Text>
            </View>
            <Switch
              value={prefs.post_comments}
              onValueChange={(v) => updatePref('post_comments', v)}
            />
          </View>
          <Divider />
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <MaterialCommunityIcons name="calendar-text-outline" size={20} color="#6b7280" />
              <Text variant="bodyMedium">Event Comments</Text>
            </View>
            <Switch
              value={prefs.event_comments}
              onValueChange={(v) => updatePref('event_comments', v)}
            />
          </View>
          <Divider />
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <MaterialCommunityIcons name="bell-alert-outline" size={20} color="#6b7280" />
              <Text variant="bodyMedium">Event Reminders</Text>
            </View>
            <Switch
              value={prefs.event_reminders}
              onValueChange={(v) => updatePref('event_reminders', v)}
            />
          </View>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Calendar Subscription */}
      <Text variant="titleSmall" style={styles.sectionLabel}>INTEGRATIONS</Text>
      <Card elevation={0} style={styles.gcalCard}>
        <Card.Content>
          <View style={styles.gcalHeader}>
            <MaterialCommunityIcons name="calendar-sync" size={24} color="#4285F4" />
            <View style={styles.gcalInfo}>
              <Text variant="bodyLarge" style={styles.gcalTitle}>Subscribe to Calendar</Text>
              <Text variant="bodySmall" style={styles.gcalSubtitle}>Add ambassador events to your calendar app. Events auto-update with RSVPs and details.</Text>
            </View>
          </View>
          <Button
            mode="contained"
            icon="calendar-plus"
            onPress={handleSubscribeCalendar}
            style={styles.gcalConnectButton}
          >
            Subscribe to Calendar
          </Button>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Security */}
      <Text variant="titleSmall" style={styles.sectionLabel}>SECURITY</Text>
      <ChangePasswordCard />

      {/* Biometric Lock */}
      {biometricAvailable && (
        <Card style={[styles.card, { marginTop: 12 }]}>
          <Card.Content>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Biometric Lock</Text>
                <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                  Require Face ID or fingerprint when returning to the app
                </Text>
              </View>
              <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
            </View>
          </Card.Content>
        </Card>
      )}

      <Divider style={styles.divider} />

      {/* Support & About */}
      <Text variant="titleSmall" style={styles.sectionLabel}>SUPPORT</Text>
      <Card elevation={0} style={styles.supportCard}>
        <Card.Content style={styles.supportContent}>
          <Pressable style={styles.supportRow} onPress={() => Linking.openURL('mailto:support@127makes.com')}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#6b7280" />
            <Text variant="bodyMedium">Contact Support</Text>
          </Pressable>
          <Pressable
            style={styles.supportRow}
            onPress={() => {
              const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://amboportal.vercel.app';
              openExternalLink(`${webUrl}/privacy`);
            }}
          >
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#6b7280" />
            <Text variant="bodyMedium">Privacy Policy</Text>
          </Pressable>
          <Pressable
            style={styles.supportRow}
            onPress={() => {
              const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://amboportal.vercel.app';
              openExternalLink(`${webUrl}/terms`);
            }}
          >
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#6b7280" />
            <Text variant="bodyMedium">Terms of Service</Text>
          </Pressable>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Sign Out */}
      <Button
        mode="contained"
        buttonColor="#ef4444"
        icon="logout"
        onPress={signOut}
        style={styles.signOutButton}
      >
        Sign Out
      </Button>

      {/* Delete Account */}
      <Button
        mode="text"
        textColor="#ef4444"
        icon="delete-outline"
        onPress={handleDeleteAccount}
        loading={deleting}
        disabled={deleting}
        style={styles.deleteButton}
      >
        Delete Account
      </Button>

      <Text variant="bodySmall" style={styles.versionText}>
        AmboPortal v{appVersion}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 48 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  name: { fontWeight: '700' },
  divider: { marginVertical: 16 },
  sectionLabel: {
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  formSection: { gap: 12 },
  input: { backgroundColor: '#fff' },
  saveButton: { borderRadius: 12, marginTop: 4 },
  pushCard: { backgroundColor: '#fff' },
  pushHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  pushInfo: { flex: 1 },
  pushTitle: { fontWeight: '600' },
  pushSubtitle: { color: '#6b7280' },
  pushLoader: { marginVertical: 8 },
  pushStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pushStatusText: { color: '#16a34a', fontWeight: '600' },
  pushEnableButton: { borderRadius: 8 },
  prefsLabel: { fontWeight: '600', marginBottom: 8, marginTop: 12, color: '#9ca3af', letterSpacing: 0.8 },
  prefsCard: { backgroundColor: '#fff' },
  prefsContent: { gap: 4 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prefInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gcalCard: { backgroundColor: '#fff' },
  gcalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  gcalInfo: { flex: 1 },
  gcalTitle: { fontWeight: '600' },
  gcalSubtitle: { color: '#6b7280' },
  gcalConnectButton: { borderRadius: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { backgroundColor: '#fff' },
  supportCard: { backgroundColor: '#fff' },
  supportContent: { gap: 0 },
  supportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  signOutButton: { borderRadius: 12 },
  deleteButton: { marginTop: 12 },
  versionText: { color: '#d1d5db', textAlign: 'center', marginTop: 16 },
});
