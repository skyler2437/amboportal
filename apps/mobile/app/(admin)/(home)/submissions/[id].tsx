import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, TextInput, Button, Divider, Avatar } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getInitials } from '@/lib/format';
import type { SemanticTokens } from '@/lib/theme';
import type { Submission, SubmissionStatus } from '@ambo/database';

interface SubmissionDetail extends Submission {
  users?: { first_name: string; last_name: string; email: string; avatar_url?: string };
}

export default function SubmissionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { styles, tokens } = useThemedStyles(makeStyles);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSubmission() {
      const { data } = await supabase
        .from('submissions')
        .select('*, users(first_name, last_name, email, avatar_url)')
        .eq('id', id)
        .single();

      if (data) {
        const sub = data as SubmissionDetail;
        setSubmission(sub);
        setFeedback(sub.feedback || '');
      }
      setLoading(false);
    }
    fetchSubmission();
  }, [id]);

  const handleAction = async (newStatus: SubmissionStatus) => {
    setSaving(true);
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus, feedback: feedback.trim() || null })
      .eq('id', id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  };

  if (loading || !submission) return <LoadingScreen />;

  const studentName = submission.users
    ? `${submission.users.first_name} ${submission.users.last_name}`
    : 'Unknown';
  const initials = submission.users
    ? getInitials(submission.users.first_name, submission.users.last_name)
    : '?';
  const currentStatus = submission.status;
  const serviceDate = new Date(submission.service_date).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Review Submission' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Student Info Card */}
          <Card elevation={0} style={styles.studentCard}>
            <Card.Content style={styles.studentContent}>
              <View style={styles.studentRow}>
                {submission.users?.avatar_url ? (
                  <Avatar.Image size={48} source={{ uri: submission.users.avatar_url }} />
                ) : (
                  <Avatar.Text size={48} label={initials} style={styles.avatarFallback} />
                )}
                <View style={styles.studentInfo}>
                  <Text variant="titleMedium" style={styles.studentName}>{studentName}</Text>
                  {submission.users?.email && (
                    <Text variant="bodySmall" style={styles.email}>{submission.users.email}</Text>
                  )}
                </View>
              </View>
              <StatusBadge status={submission.status} />
            </Card.Content>
          </Card>

          {/* Submission Details */}
          <Text variant="titleSmall" style={styles.sectionLabel}>SUBMISSION DETAILS</Text>
          <Card elevation={0} style={styles.detailsCard}>
            <Card.Content style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconRow}>
                  <MaterialCommunityIcons name="briefcase-outline" size={18} color={tokens.textSecondary} />
                  <Text variant="bodySmall" style={styles.detailLabel}>Service Type</Text>
                </View>
                <Text variant="bodyMedium" style={styles.detailValue}>{submission.service_type}</Text>
              </View>
              <Divider style={styles.rowDivider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIconRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={18} color={tokens.textSecondary} />
                  <Text variant="bodySmall" style={styles.detailLabel}>Date</Text>
                </View>
                <Text variant="bodyMedium" style={styles.detailValue}>{serviceDate}</Text>
              </View>
              <Divider style={styles.rowDivider} />
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text variant="headlineSmall" style={styles.statNumber}>{Number(submission.hours)}</Text>
                  <Text variant="bodySmall" style={styles.statUnit}>Hours</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text variant="headlineSmall" style={styles.statNumber}>{Number(submission.credits)}</Text>
                  <Text variant="bodySmall" style={styles.statUnit}>Credits</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Feedback Section */}
          <Text variant="titleSmall" style={styles.sectionLabel}>FEEDBACK</Text>
          <TextInput
            mode="outlined"
            placeholder="Add feedback for the student..."
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
            style={styles.feedbackInput}
          />

          {/* Action Buttons — always visible, show contextual actions */}
          <View style={styles.actionButtons}>
            {currentStatus !== 'Approved' && (
              <Button
                mode="contained"
                icon="check-circle-outline"
                buttonColor={tokens.statusGoodFg}
                textColor={tokens.onAccent}
                onPress={() => handleAction('Approved')}
                loading={saving}
                disabled={saving}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Approve
              </Button>
            )}
            {currentStatus !== 'Denied' && (
              <Button
                mode="contained"
                icon="close-circle-outline"
                buttonColor={tokens.statusBadFg}
                textColor={tokens.onAccent}
                onPress={() => handleAction('Denied')}
                loading={saving}
                disabled={saving}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Deny
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40 },
  studentCard: { backgroundColor: t.surface, marginBottom: 20 },
  studentContent: { gap: 12 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarFallback: { backgroundColor: t.surfaceVariant },
  studentInfo: { flex: 1 },
  studentName: { fontWeight: '700' },
  email: { color: t.textSecondary, marginTop: 2 },
  sectionLabel: {
    color: t.textMuted,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  detailsCard: { backgroundColor: t.surface, marginBottom: 20 },
  detailsContent: { gap: 0 },
  detailRow: {
    paddingVertical: 12,
  },
  detailIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  detailLabel: { color: t.textMuted },
  detailValue: { fontWeight: '500', marginLeft: 26 },
  rowDivider: { backgroundColor: t.divider },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 12,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statDivider: { width: 1, backgroundColor: t.divider },
  statNumber: { fontWeight: '700', color: t.textPrimary },
  statUnit: { color: t.textMuted, marginTop: 2 },
  feedbackInput: { backgroundColor: t.surface, marginBottom: 8, minHeight: 100 },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  actionButtonContent: {
    paddingVertical: 6,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
