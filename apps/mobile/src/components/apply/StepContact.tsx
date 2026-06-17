import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import type { ApplicationData } from '@ambo/database/application-types';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, fontWeight, type SemanticTokens } from '@/lib/theme';

interface StepContactProps {
  data: ApplicationData;
  onChange: (field: keyof ApplicationData, value: any) => void;
}

export default function StepContact({ data, onChange }: StepContactProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.heading}>Welcome</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Enter your phone number to start or resume your application.
      </Text>
      <TextInput
        label="Cell Phone Number"
        mode="outlined"
        value={data.phone_number}
        onChangeText={(v) => onChange('phone_number', v.replace(/\D/g, ''))}
        keyboardType="phone-pad"
        maxLength={10}
        style={styles.input}
      />
      <Text variant="bodySmall" style={styles.hint}>10-digit number, no dashes</Text>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { gap: space.sm },
  heading: { textAlign: 'center', fontWeight: fontWeight.semibold },
  subtitle: { textAlign: 'center', color: t.textSecondary, marginBottom: space.sm },
  input: { backgroundColor: t.surface },
  hint: { color: t.textMuted },
});
