import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

const STEP_LABELS = ['Contact Info', 'Personal Info', 'Academic Info', 'References', 'Questionnaire'];

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const progress = currentStep / totalSteps;

  return (
    <View style={styles.container}>
      <ProgressBar progress={progress} style={styles.bar} />
      <Text variant="titleMedium" style={styles.label}>
        {STEP_LABELS[currentStep] ?? ''}
      </Text>
      <Text variant="bodySmall" style={styles.stepCount}>
        Step {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    container: { alignItems: 'center', marginBottom: 16 },
    bar: { width: '100%', height: 6, borderRadius: 3, backgroundColor: t.border },
    label: { marginTop: 12, fontWeight: '600' },
    stepCount: { marginTop: 2, color: t.textMuted },
  });
