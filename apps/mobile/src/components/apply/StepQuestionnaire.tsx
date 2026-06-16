import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import type { ApplicationData } from '@ambo/database/application-types';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

const QUESTIONS: { field: keyof ApplicationData; label: string }[] = [
  { field: 'q_involvement', label: 'Please list your current or past involvement...' },
  { field: 'q_why_ambassador', label: 'Why do you want to be a Student Ambassador?' },
  { field: 'q_faith', label: 'Have you accepted Jesus Christ as your Lord and Savior?' },
  { field: 'q_love_linfield', label: 'What do you love most about Linfield?' },
  { field: 'q_change_linfield', label: 'What would you change about Linfield?' },
  { field: 'q_family_decision', label: 'Why did you/your family decide to attend Linfield?' },
  { field: 'q_strengths', label: 'Personal Strengths' },
  { field: 'q_weaknesses', label: 'Personal Weaknesses' },
  { field: 'q_time_commitment', label: 'Time Commitment (Monthly)' },
];

interface StepQuestionnaireProps {
  data: ApplicationData;
  onChange: (field: keyof ApplicationData, value: any) => void;
}

export default function StepQuestionnaire({ data, onChange }: StepQuestionnaireProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      {QUESTIONS.map(({ field, label }) => (
        <TextInput
          key={field}
          label={`${label} *`}
          mode="outlined"
          value={(data[field] as string) || ''}
          onChangeText={(v) => onChange(field, v)}
          multiline
          numberOfLines={3}
          style={styles.input}
        />
      ))}
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { gap: 12 },
  input: { backgroundColor: t.surface, minHeight: 80 },
});
