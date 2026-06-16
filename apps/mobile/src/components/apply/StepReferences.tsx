import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Text, Divider } from 'react-native-paper';
import type { ApplicationData } from '@ambo/database/application-types';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, fontWeight, type SemanticTokens } from '@/lib/theme';

interface StepReferencesProps {
  data: ApplicationData;
  onChange: (field: keyof ApplicationData, value: any) => void;
}

export default function StepReferences({ data, onChange }: StepReferencesProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.sectionTitle}>Academic Reference</Text>
      <TextInput
        label="Teacher Name *"
        mode="outlined"
        value={data.referrer_academic_name || ''}
        onChangeText={(v) => onChange('referrer_academic_name', v)}
        style={styles.input}
      />
      <TextInput
        label="Teacher Email *"
        mode="outlined"
        value={data.referrer_academic_email || ''}
        onChangeText={(v) => onChange('referrer_academic_email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.sectionTitle}>Spiritual Reference</Text>
      <TextInput
        label="Pastor/Teacher Name *"
        mode="outlined"
        value={data.referrer_bible_name || ''}
        onChangeText={(v) => onChange('referrer_bible_name', v)}
        style={styles.input}
      />
      <TextInput
        label="Pastor/Teacher Email *"
        mode="outlined"
        value={data.referrer_bible_email || ''}
        onChangeText={(v) => onChange('referrer_bible_email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { gap: space.md },
  sectionTitle: { fontWeight: fontWeight.semibold, marginTop: space.xs },
  input: { backgroundColor: t.surface },
  divider: { marginVertical: space.sm },
});
