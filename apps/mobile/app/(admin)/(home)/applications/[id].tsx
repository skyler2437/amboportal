import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Card, Button, Divider, Dialog, Portal, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { Application, ApplicationStatus } from '@/hooks/useApplications';

const QUESTION_LABELS = [
  'Why do you want to be a Student Ambassador?',
  'What qualities make a good ambassador?',
  'Describe a time you showed leadership.',
  'How would you promote Linfield to prospective students?',
  'What is your favorite thing about Linfield?',
  'Describe your involvement in campus activities.',
  'How do you handle difficult situations?',
  'What are your goals for the next year?',
  'Is there anything else you would like us to know?',
];

const statusStyles: Record<ApplicationStatus, { bg: string; text: string; icon: string }> = {
  submitted: { bg: '#eff6ff', text: '#3b82f6', icon: 'file-document-outline' },
  approved: { bg: '#ecfdf5', text: '#10b981', icon: 'check-circle-outline' },
  rejected: { bg: '#fef2f2', text: '#ef4444', icon: 'close-circle-outline' },
  draft: { bg: '#f5f5f5', text: '#6b7280', icon: 'pencil-outline' },
};

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ApplicationStatus | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchApplication = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setApplication(data as Application);
      }
      setLoading(false);
    };
    if (id) fetchApplication();
  }, [id]);

  const executeStatusUpdate = async () => {
    if (!application || !confirmAction) return;
    setUpdating(true);
    setConfirmAction(null);

    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: confirmAction, updated_at: new Date().toISOString() })
        .eq('id', application.id);
      if (error) throw error;

      // On approval, promote user role from applicant to student
      if (confirmAction === 'approved') {
        await supabase
          .from('users')
          .update({ role: 'student' })
          .eq('phone', application.phone_number)
          .eq('role', 'applicant');
      }

      setApplication({ ...application, status: confirmAction });
      Alert.alert(
        confirmAction === 'approved' ? 'Approved' : confirmAction === 'rejected' ? 'Rejected' : 'Updated',
        confirmAction === 'approved'
          ? `${application.first_name} has been approved and promoted to student.`
          : `Application has been ${confirmAction}.`,
      );
      setRejectReason('');
    } catch {
      Alert.alert('Error', 'Failed to update application status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!application) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text variant="bodyLarge" style={styles.errorText}>Application not found</Text>
        <Button mode="outlined" onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  const colors = statusStyles[application.status] || statusStyles.draft;
  const isSubmitted = application.status === 'submitted';
  const answeredQuestions = QUESTION_LABELS.filter((_, i) => {
    const key = `question_${i + 1}` as keyof Application;
    return !!application[key];
  });

  return (
    <>
      <Stack.Screen options={{ title: `${application.first_name} ${application.last_name}` }} />
      <Portal>
        <Dialog visible={confirmAction !== null} onDismiss={() => setConfirmAction(null)}>
          <Dialog.Title>
            {confirmAction === 'approved' ? 'Approve Application' : 'Reject Application'}
          </Dialog.Title>
          <Dialog.Content>
            {confirmAction === 'approved' ? (
              <Text variant="bodyMedium">
                Approve {application.first_name} {application.last_name}'s application? They will be promoted to student role.
              </Text>
            ) : (
              <>
                <Text variant="bodyMedium" style={styles.dialogText}>
                  Reject {application.first_name} {application.last_name}'s application?
                </Text>
                <TextInput
                  mode="outlined"
                  label="Reason (optional)"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={3}
                  style={styles.rejectInput}
                  dense
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              onPress={executeStatusUpdate}
              textColor={confirmAction === 'approved' ? '#10b981' : '#ef4444'}
            >
              {confirmAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status Header */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <MaterialCommunityIcons name={colors.icon as any} size={16} color={colors.text} />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.date}>
            Applied {new Date(application.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Personal Info */}
        <Text variant="titleSmall" style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
        <Card elevation={0} style={styles.card}>
          <Card.Content style={styles.infoContent}>
            <InfoRow icon="account" label="Name" value={`${application.first_name} ${application.last_name}`} />
            <Divider style={styles.rowDivider} />
            <InfoRow icon="email-outline" label="Email" value={application.email} />
            <Divider style={styles.rowDivider} />
            <InfoRow icon="phone-outline" label="Phone" value={application.phone_number} />
          </Card.Content>
        </Card>

        {/* Academic Info */}
        <Text variant="titleSmall" style={styles.sectionLabel}>ACADEMIC INFORMATION</Text>
        <Card elevation={0} style={styles.card}>
          <Card.Content style={styles.infoContent}>
            <InfoRow icon="school-outline" label="Current Grade" value={application.grade_current || 'N/A'} />
            <Divider style={styles.rowDivider} />
            <InfoRow icon="school" label="Entry Grade" value={application.grade_entry || 'N/A'} />
            <Divider style={styles.rowDivider} />
            <InfoRow icon="chart-line" label="GPA" value={application.gpa || 'N/A'} />
            {application.transcript_url && (
              <>
                <Divider style={styles.rowDivider} />
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="file-document" size={20} color="#6b7280" />
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSmall" style={styles.infoLabel}>Transcript</Text>
                    <Button
                      mode="text"
                      compact
                      onPress={() => Linking.openURL(application.transcript_url!)}
                      style={styles.linkButton}
                    >
                      View Transcript
                    </Button>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* References */}
        {(application.referrer_1_name || application.referrer_2_name) && (
          <>
            <Text variant="titleSmall" style={styles.sectionLabel}>REFERENCES</Text>
            <Card elevation={0} style={styles.card}>
              <Card.Content style={styles.infoContent}>
                {application.referrer_1_name && (
                  <InfoRow icon="account-outline" label="Reference 1" value={`${application.referrer_1_name} (${application.referrer_1_email || 'No email'})`} />
                )}
                {application.referrer_1_name && application.referrer_2_name && <Divider style={styles.rowDivider} />}
                {application.referrer_2_name && (
                  <InfoRow icon="account-outline" label="Reference 2" value={`${application.referrer_2_name} (${application.referrer_2_email || 'No email'})`} />
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {/* Questionnaire */}
        <Text variant="titleSmall" style={styles.sectionLabel}>
          QUESTIONNAIRE ({answeredQuestions.length}/{QUESTION_LABELS.length})
        </Text>
        {QUESTION_LABELS.map((label, index) => {
          const key = `question_${index + 1}` as keyof Application;
          const answer = application[key] as string | undefined;
          if (!answer) return null;
          return (
            <Card elevation={0} key={index} style={styles.questionCard}>
              <Card.Content>
                <Text variant="labelMedium" style={styles.questionLabel}>{label}</Text>
                <Text variant="bodyMedium" style={styles.answer}>{answer}</Text>
              </Card.Content>
            </Card>
          );
        })}

        {/* Action Buttons */}
        {isSubmitted && (
          <>
            <Divider style={styles.actionDivider} />
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                icon="check-circle-outline"
                buttonColor="#10b981"
                textColor="#fff"
                onPress={() => setConfirmAction('approved')}
                loading={updating}
                disabled={updating}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Approve
              </Button>
              <Button
                mode="contained"
                icon="close-circle-outline"
                buttonColor="#ef4444"
                textColor="#fff"
                onPress={() => setConfirmAction('rejected')}
                loading={updating}
                disabled={updating}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Reject
              </Button>
            </View>
          </>
        )}

        {/* Already reviewed — show status update option */}
        {!isSubmitted && application.status !== 'draft' && (
          <View style={styles.reviewedNote}>
            <MaterialCommunityIcons
              name={application.status === 'approved' ? 'check-circle' : 'close-circle'}
              size={20}
              color={colors.text}
            />
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              This application was {application.status}.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as any} size={20} color="#6b7280" />
      <View style={{ flex: 1 }}>
        <Text variant="labelSmall" style={styles.infoLabel}>{label}</Text>
        <Text variant="bodyMedium">{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: '#6b7280' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '600' },
  date: { color: '#9ca3af' },
  sectionLabel: {
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  card: { backgroundColor: '#fff', marginBottom: 4 },
  infoContent: { gap: 0 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoLabel: { color: '#9ca3af', marginBottom: 2 },
  rowDivider: { backgroundColor: '#f3f4f6' },
  linkButton: { alignSelf: 'flex-start', marginTop: -4, marginLeft: -8 },
  questionCard: { backgroundColor: '#fff', marginBottom: 8 },
  questionLabel: { color: '#6b7280', marginBottom: 6 },
  answer: { lineHeight: 20 },
  actionDivider: { marginVertical: 20 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, borderRadius: 12 },
  actionButtonContent: { paddingVertical: 6 },
  actionButtonLabel: { fontSize: 16, fontWeight: '600' },
  reviewedNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, justifyContent: 'center' },
  dialogText: { marginBottom: 12 },
  rejectInput: { backgroundColor: '#fff' },
});
