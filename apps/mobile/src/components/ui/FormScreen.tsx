import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Platform } from 'react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, type SemanticTokens } from '@/lib/theme';

interface FormScreenProps {
  children: React.ReactNode;
}

/** Keyboard-aware scrolling form wrapper. Replaces the repeated
 * KeyboardAvoidingView + ScrollView(keyboardShouldPersistTaps) + padded content. */
export function FormScreen({ children }: FormScreenProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children as any}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.background },
    content: { padding: space.lg, paddingBottom: space.xxl },
  });
