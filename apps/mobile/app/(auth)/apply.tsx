import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApplicationData } from '@ambo/database/application-types';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, type SemanticTokens } from '@/lib/theme';

import StepProgress from '@/components/apply/StepProgress';
import StepContact from '@/components/apply/StepContact';
import StepPersonal from '@/components/apply/StepPersonal';
import StepAcademic from '@/components/apply/StepAcademic';
import StepReferences from '@/components/apply/StepReferences';
import StepQuestionnaire from '@/components/apply/StepQuestionnaire';
import SuccessScreen from '@/components/apply/SuccessScreen';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || '';
const TOTAL_STEPS = 5;
// Application token minted by the server when the draft is created. It
// authorizes all further reads/writes for this application — phone number
// alone is not enough (see web: lib/application-auth.ts).
const APPLICATION_TOKEN_KEY = 'ambo_application_token';

const INITIAL_DATA: ApplicationData = {
  phone_number: '',
  status: 'draft',
  current_step: 1,
  first_name: '',
  last_name: '',
  email: '',
  grade_current: '',
  grade_entry: '',
  gpa: undefined,
  transcript_url: '',
  referrer_academic_name: '',
  referrer_academic_email: '',
  referrer_bible_name: '',
  referrer_bible_email: '',
  q_involvement: '',
  q_why_ambassador: '',
  q_faith: '',
  q_love_linfield: '',
  q_change_linfield: '',
  q_family_decision: '',
  q_strengths: '',
  q_weaknesses: '',
  q_time_commitment: '',
};

function validate(step: number, data: ApplicationData): string | null {
  switch (step) {
    case 0:
      if (!data.phone_number || data.phone_number.length < 10) return 'Please enter a valid 10-digit phone number.';
      return null;
    case 1:
      if (!data.first_name) return 'First Name is required.';
      if (!data.last_name) return 'Last Name is required.';
      if (!data.email) return 'Student Email is required.';
      if (!data.grade_current) return 'Current Grade is required.';
      if (!data.grade_entry) return 'Entry Grade is required.';
      return null;
    case 2:
      if (data.gpa === undefined || data.gpa === null) return 'GPA is required.';
      if (data.gpa < 0 || data.gpa > 5) return 'GPA must be between 0.00 and 5.00.';
      return null;
    case 3:
      if (!data.referrer_academic_name) return 'Academic Reference Name is required.';
      if (!data.referrer_academic_email) return 'Academic Reference Email is required.';
      if (!data.referrer_bible_name) return 'Spiritual Reference Name is required.';
      if (!data.referrer_bible_email) return 'Spiritual Reference Email is required.';
      return null;
    case 4:
      if (!data.q_involvement) return 'Involvement question is required.';
      if (!data.q_why_ambassador) return 'Why Ambassador question is required.';
      if (!data.q_faith) return 'Faith question is required.';
      if (!data.q_love_linfield) return 'Love about Linfield question is required.';
      if (!data.q_change_linfield) return 'Change about Linfield question is required.';
      if (!data.q_family_decision) return 'Family decision question is required.';
      if (!data.q_strengths) return 'Strengths question is required.';
      if (!data.q_weaknesses) return 'Weaknesses question is required.';
      if (!data.q_time_commitment) return 'Time commitment question is required.';
      return null;
    default:
      return null;
  }
}

export default function ApplyScreen() {
  const { styles, tokens } = useThemedStyles(makeStyles);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ApplicationData>(INITIAL_DATA);
  const [applicationToken, setApplicationToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  // Restore the application token so the draft can be resumed after the app
  // is killed and relaunched on this device.
  useEffect(() => {
    AsyncStorage.getItem(APPLICATION_TOKEN_KEY)
      .then((stored) => {
        if (stored) setApplicationToken(stored);
      })
      .catch(() => {});
  }, []);

  const authHeaders = (): Record<string, string> =>
    applicationToken ? { 'x-application-token': applicationToken } : {};

  const handleChange = (field: keyof ApplicationData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveProgress = async (stepOverride?: number) => {
    const res = await fetch(`${WEB_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        ...formData,
        current_step: stepOverride ?? currentStep + 1,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save');
    }
    // The create response includes the token authorizing further saves.
    const body = await res.json().catch(() => ({}));
    if (body.application_token) {
      setApplicationToken(body.application_token);
      AsyncStorage.setItem(APPLICATION_TOKEN_KEY, body.application_token).catch(() => {});
    }
  };

  const handleNext = async () => {
    const error = validate(currentStep, formData);
    if (error) {
      Alert.alert('Validation', error);
      return;
    }

    setSaving(true);
    try {
      if (currentStep === 0) {
        // Check for existing application
        const res = await fetch(
          `${WEB_URL}/api/applications?phone=${formData.phone_number}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const existing: ApplicationData = await res.json();
          setFormData(existing);
          if (existing.status === 'submitted') {
            setSubmitted(true);
            setSaving(false);
            return;
          }
          // Resume from saved step (but advance at least to step 1)
          const resumeStep = Math.max(1, Math.min((existing.current_step || 1) - 1, TOTAL_STEPS - 1));
          setCurrentStep(resumeStep);
          setSaving(false);
          return;
        }
        if (res.status === 403) {
          // An application exists for this phone but this device doesn't
          // hold its application token.
          const err = await res.json().catch(() => ({}));
          Alert.alert(
            'Application Exists',
            err.error ||
              'An application with this phone number already exists. Continue on the device where you started it, or contact the Ambassador Coordinator.'
          );
          setSaving(false);
          return;
        }
        // No existing app — save the phone and move on
        await saveProgress(2);
      } else {
        await saveProgress(currentStep + 2);
      }
      setCurrentStep((prev) => prev + 1);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save progress.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setConfirmingSubmit(false);
    }
  };

  const handleSubmit = async () => {
    const error = validate(currentStep, formData);
    if (error) {
      Alert.alert('Validation', error);
      return;
    }

    if (!confirmingSubmit) {
      Alert.alert(
        'Confirm Submission',
        'Are you sure? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            style: 'destructive',
            onPress: async () => {
              setSubmitting(true);
              try {
                // Save final step data
                await saveProgress(TOTAL_STEPS);
                // Submit
                const res = await fetch(`${WEB_URL}/api/applications/submit`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...authHeaders() },
                  body: JSON.stringify({ phone_number: formData.phone_number }),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.error || 'Submission failed');
                }
                AsyncStorage.removeItem(APPLICATION_TOKEN_KEY).catch(() => {});
                setSubmitted(true);
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to submit application.');
              } finally {
                setSubmitting(false);
              }
            },
          },
        ],
      );
      return;
    }
  };

  if (submitted) {
    return <SuccessScreen />;
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <StepProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <View style={styles.formCard}>
          {currentStep === 0 && <StepContact data={formData} onChange={handleChange} />}
          {currentStep === 1 && <StepPersonal data={formData} onChange={handleChange} />}
          {currentStep === 2 && <StepAcademic data={formData} onChange={handleChange} />}
          {currentStep === 3 && <StepReferences data={formData} onChange={handleChange} />}
          {currentStep === 4 && <StepQuestionnaire data={formData} onChange={handleChange} />}
        </View>

        {/* Navigation buttons */}
        <View style={styles.footer}>
          {currentStep > 0 ? (
            <Button
              mode="outlined"
              onPress={handleBack}
              disabled={saving || submitting}
              icon={() => <ChevronLeft size={18} color={tokens.textSecondary} />}
              style={styles.backButton}
            >
              Back
            </Button>
          ) : (
            <View />
          )}

          {isLastStep ? (
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={submitting || saving}
              loading={submitting}
              icon={() =>
                submitting ? null : <Check size={18} color={tokens.onAccent} />
              }
              style={styles.nextButton}
            >
              Submit
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleNext}
              disabled={saving}
              loading={saving}
              icon={() =>
                saving ? null : <ChevronRight size={18} color={tokens.onAccent} />
              }
              contentStyle={{ flexDirection: 'row-reverse' }}
              style={styles.nextButton}
            >
              Next
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.background },
    scroll: { flexGrow: 1, padding: space.xl, paddingBottom: space.xxl },
    formCard: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      padding: space.xl,
      marginBottom: space.xl,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: { borderColor: t.border },
    nextButton: { borderRadius: radius.sm, minWidth: 120 },
  });
