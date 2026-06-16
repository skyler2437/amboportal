import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, type SemanticTokens } from '@/lib/theme';

type TextInputProps = React.ComponentProps<typeof TextInput>;

interface FormFieldProps extends Omit<TextInputProps, 'mode' | 'error'> {
  label: string;
  /** Helper text shown below the input when there's no error. */
  hint?: string;
  /** Error message; when set, the input renders in its error state. */
  error?: string;
}

/** Outlined text input with a consistent label/hint/error treatment.
 * Replaces the ~59 ad-hoc `<TextInput mode="outlined" label=...>` blocks. */
export function FormField({ label, hint, error, style, ...rest }: FormFieldProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <TextInput mode="outlined" label={label} error={!!error} dense style={[styles.input, style]} {...rest} />
      {error ? (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="bodySmall" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    field: { marginBottom: space.md },
    input: { backgroundColor: t.surface },
    hint: { color: t.textMuted, marginTop: space.xs },
    error: { color: t.statusBadFg, marginTop: space.xs },
  });
