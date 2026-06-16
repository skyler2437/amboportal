import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Avatar, Divider, TextInput, Button, SegmentedButtons, Dialog, Portal } from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { RoleBadge } from '@/components/RoleBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getInitials } from '@/lib/format';
import { space, radius, fontWeight } from '@/lib/theme';
import type { SemanticTokens } from '@/lib/theme';
import type { User, UserRole, SubmissionStatus } from '@ambo/database';

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

interface SubmissionSummary {
  id: string;
  service_type: string;
  service_date: string;
  hours: number;
  status: SubmissionStatus;
}

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { styles, tokens } = useThemedStyles(makeStyles);
  const { userRole: currentUserRole } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmRoleChange, setConfirmRoleChange] = useState<string | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('student');

  // Submissions summary
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [showSubmissions, setShowSubmissions] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, role, avatar_url')
        .eq('id', id)
        .single();
      if (data) {
        const u = data as User;
        setUser(u);
        setFirstName(u.first_name || '');
        setLastName(u.last_name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setRole(u.role || 'student');
      }
      setLoading(false);
    }
    fetchUser();
  }, [id]);

  // Fetch submissions on demand
  useEffect(() => {
    if (!showSubmissions || submissions.length > 0) return;
    async function fetchSubmissions() {
      const { data } = await supabase
        .from('submissions')
        .select('id, service_type, service_date, hours, status')
        .eq('user_id', id)
        .order('service_date', { ascending: false })
        .limit(10);
      setSubmissions((data as SubmissionSummary[]) || []);
    }
    fetchSubmissions();
  }, [showSubmissions, id, submissions.length]);

  const hasChanges = user && (
    firstName !== (user.first_name || '') ||
    lastName !== (user.last_name || '') ||
    email !== (user.email || '') ||
    phone !== (user.phone || '') ||
    role !== (user.role || 'student')
  );

  const handleRoleChange = (newRole: string) => {
    if (newRole !== role) {
      setConfirmRoleChange(newRole);
    }
  };

  const confirmRole = () => {
    if (confirmRoleChange) {
      setRole(confirmRoleChange);
    }
    setConfirmRoleChange(null);
  };

  const handleSave = async () => {
    if (!user) return;

    if (role === 'superadmin' && currentUserRole !== 'superadmin') {
      Alert.alert('Permission Denied', 'Only superadmins can promote users to superadmin.');
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      Alert.alert('Invalid Phone', 'Phone number must be exactly 10 digits.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role: role as UserRole,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      console.error('User update error:', error);
      Alert.alert('Error', error.message);
    } else {
      // Re-fetch to confirm the update actually persisted (RLS may silently block)
      const { data: refreshed } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, role, avatar_url')
        .eq('id', user.id)
        .single();

      if (refreshed && refreshed.role !== role) {
        Alert.alert('Permission Denied', 'Unable to change this user\'s role. The update may have been blocked by database permissions.');
        setRole(refreshed.role || 'student');
        return;
      }

      if (refreshed) {
        const u = refreshed as User;
        setUser(u);
        setFirstName(u.first_name || '');
        setLastName(u.last_name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setRole(u.role || 'student');
      }
      Alert.alert('Success', 'User updated successfully.');
    }
  };

  if (loading || !user) return <LoadingScreen />;

  const initials = getInitials(user.first_name, user.last_name);
  const totalHours = submissions.reduce((sum, s) => sum + Number(s.hours), 0);
  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;

  return (
    <>
      <Stack.Screen options={{ title: `${user.first_name} ${user.last_name}` }} />
      <Portal>
        <Dialog visible={confirmRoleChange !== null} onDismiss={() => setConfirmRoleChange(null)}>
          <Dialog.Title>Change Role</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Change {user.first_name}'s role from{' '}
              <Text style={styles.bold}>{role}</Text> to{' '}
              <Text style={styles.bold}>{confirmRoleChange}</Text>?
            </Text>
            {confirmRoleChange === 'superadmin' && (
              <Text variant="bodySmall" style={styles.warningText}>
                Superadmins have full system access.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmRoleChange(null)}>Cancel</Button>
            <Button onPress={confirmRole}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Avatar & Name */}
        <View style={styles.avatarSection}>
          {user.avatar_url ? (
            <Avatar.Image size={80} source={{ uri: user.avatar_url }} />
          ) : (
            <Avatar.Text size={80} label={initials} style={styles.avatar} />
          )}
          <RoleBadge role={role as UserRole} />
        </View>

        <Divider style={styles.divider} />

        {/* Editable Fields */}
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
        </View>

        <Divider style={styles.divider} />

        {/* Role Picker */}
        <Text variant="titleSmall" style={styles.sectionLabel}>ROLE</Text>
        <SegmentedButtons
          value={role}
          onValueChange={handleRoleChange}
          buttons={
            currentUserRole === 'superadmin'
              ? ROLE_OPTIONS
              : ROLE_OPTIONS.filter((r) => r.value !== 'superadmin')
          }
          style={styles.roleButtons}
        />

        {/* Save Button */}
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

        <Divider style={styles.divider} />

        {/* Submissions Summary (collapsible) */}
        <Card
          elevation={0}
          style={styles.summaryCard}
          onPress={() => setShowSubmissions(!showSubmissions)}
        >
          <Card.Content style={styles.summaryHeader}>
            <View style={styles.summaryLeft}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={tokens.textPrimary} />
              <Text variant="bodyLarge" style={styles.summaryTitle}>Submissions</Text>
            </View>
            <MaterialCommunityIcons
              name={showSubmissions ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={tokens.textMuted}
            />
          </Card.Content>
        </Card>

        {showSubmissions && (
          <Card elevation={0} style={styles.submissionsCard}>
            <Card.Content>
              {submissions.length === 0 ? (
                <Text variant="bodySmall" style={styles.noData}>No submissions found</Text>
              ) : (
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text variant="headlineSmall" style={styles.statNumber}>{totalHours.toFixed(1)}</Text>
                      <Text variant="bodySmall" style={styles.statUnit}>Total Hours</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text variant="headlineSmall" style={styles.statNumber}>{approvedCount}</Text>
                      <Text variant="bodySmall" style={styles.statUnit}>Approved</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text variant="headlineSmall" style={styles.statNumber}>{submissions.length}</Text>
                      <Text variant="bodySmall" style={styles.statUnit}>Total</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />
                  {submissions.map((sub) => (
                    <View key={sub.id} style={styles.subRow}>
                      <View style={styles.subInfo}>
                        <Text variant="bodyMedium" style={styles.subType}>{sub.service_type}</Text>
                        <Text variant="bodySmall" style={styles.subDate}>{sub.service_date} · {Number(sub.hours)}h</Text>
                      </View>
                      <StatusBadge status={sub.status} />
                    </View>
                  ))}
                </>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  content: { padding: space.lg, paddingBottom: space.xxl },
  avatarSection: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  avatar: { backgroundColor: t.surfaceVariant },
  bold: { fontWeight: fontWeight.bold },
  warningText: { color: t.statusWarnFg, marginTop: space.sm },
  divider: { marginVertical: space.lg },
  sectionLabel: {
    color: t.textMuted,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: space.md,
  },
  formSection: { gap: space.md },
  input: { backgroundColor: t.surface },
  roleButtons: { marginBottom: space.xs },
  saveButton: { marginTop: space.lg, borderRadius: radius.md },
  summaryCard: { backgroundColor: t.surface },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  summaryTitle: { fontWeight: fontWeight.semibold },
  submissionsCard: { backgroundColor: t.surface, marginTop: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  noData: { color: t.textMuted, paddingVertical: space.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.md },
  statItem: { alignItems: 'center' },
  statNumber: { fontWeight: fontWeight.bold, color: t.textPrimary },
  statUnit: { color: t.textMuted, marginTop: space.xxs },
  rowDivider: { backgroundColor: t.divider, marginVertical: space.sm },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
  },
  subInfo: { flex: 1, marginRight: space.md },
  subType: { fontWeight: fontWeight.medium },
  subDate: { color: t.textMuted, marginTop: space.xxs },
});
