import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={styles.container}>
      <Icon source="alert-circle-outline" size={48} color={tokens.statusBadFg} />
      <Text variant="titleMedium" style={styles.title}>Something went wrong</Text>
      {message && (
        <Text variant="bodyMedium" style={styles.message}>{message}</Text>
      )}
      {onRetry && (
        <Button
          mode="outlined"
          icon="refresh"
          onPress={onRetry}
          style={styles.retryButton}
        >
          Try Again
        </Button>
      )}
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontWeight: '600',
    color: t.textPrimary,
    textAlign: 'center',
  },
  message: {
    color: t.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 8,
  },
});
