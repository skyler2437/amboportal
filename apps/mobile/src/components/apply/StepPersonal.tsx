import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Text, Menu, Button } from 'react-native-paper';
import type { ApplicationData } from '@ambo/database/application-types';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

const GRADE_OPTIONS = [
  { label: 'Freshman (9th)', value: '9' },
  { label: 'Sophomore (10th)', value: '10' },
  { label: 'Junior (11th)', value: '11' },
  { label: 'Senior (12th)', value: '12' },
];

interface StepPersonalProps {
  data: ApplicationData;
  onChange: (field: keyof ApplicationData, value: any) => void;
}

export default function StepPersonal({ data, onChange }: StepPersonalProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [menuVisible, setMenuVisible] = useState(false);
  const selectedLabel = GRADE_OPTIONS.find((o) => o.value === data.grade_current)?.label || 'Select...';

  return (
    <View style={styles.container}>
      <TextInput
        label="First Name *"
        mode="outlined"
        value={data.first_name || ''}
        onChangeText={(v) => onChange('first_name', v)}
        style={styles.input}
      />
      <TextInput
        label="Last Name *"
        mode="outlined"
        value={data.last_name || ''}
        onChangeText={(v) => onChange('last_name', v)}
        style={styles.input}
      />
      <TextInput
        label="Student Email *"
        mode="outlined"
        value={data.email || ''}
        onChangeText={(v) => onChange('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <Text variant="bodySmall" style={styles.label}>Current Grade *</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setMenuVisible(true)}
            contentStyle={styles.menuButton}
            style={styles.menuButtonOuter}
          >
            {selectedLabel}
          </Button>
        }
      >
        {GRADE_OPTIONS.map((opt) => (
          <Menu.Item
            key={opt.value}
            title={opt.label}
            onPress={() => {
              onChange('grade_current', opt.value);
              setMenuVisible(false);
            }}
          />
        ))}
      </Menu>

      <TextInput
        label="Grade Entered Linfield *"
        mode="outlined"
        placeholder="e.g. 6th Grade"
        value={data.grade_entry || ''}
        onChangeText={(v) => onChange('grade_entry', v)}
        style={styles.input}
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { gap: 10 },
  input: { backgroundColor: t.surface },
  label: { color: t.textSecondary, marginTop: 4 },
  menuButton: { justifyContent: 'flex-start' },
  menuButtonOuter: { borderColor: t.border },
});
