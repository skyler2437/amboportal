import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

/**
 * Presentational form for the editable profile fields (first/last name, email,
 * phone) plus the conditional "Save Changes" button. Pure function of props —
 * all state and the save handler live in the parent screen.
 */
interface ProfileFieldsFormProps {
  firstName: string;
  onChangeFirstName: (v: string) => void;
  lastName: string;
  onChangeLastName: (v: string) => void;
  email: string;
  onChangeEmail: (v: string) => void;
  phone: string;
  onChangePhone: (v: string) => void;
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
}

export function ProfileFieldsForm({
  firstName,
  onChangeFirstName,
  lastName,
  onChangeLastName,
  email,
  onChangeEmail,
  phone,
  onChangePhone,
  hasChanges,
  saving,
  onSave,
}: ProfileFieldsFormProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={styles.formSection}>
      <TextInput
        mode="outlined"
        label="First Name"
        value={firstName}
        onChangeText={onChangeFirstName}
        dense
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Last Name"
        value={lastName}
        onChangeText={onChangeLastName}
        dense
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={onChangeEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        dense
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Phone (10 digits)"
        value={phone}
        onChangeText={onChangePhone}
        keyboardType="phone-pad"
        maxLength={10}
        dense
        style={styles.input}
      />
      {hasChanges && (
        <Button
          mode="contained"
          onPress={onSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      )}
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    formSection: { gap: 12 },
    input: { backgroundColor: t.surface },
    saveButton: { borderRadius: 12, marginTop: 4 },
  });
