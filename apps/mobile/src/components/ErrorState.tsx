import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, fontWeight, type SemanticTokens } from '@/lib/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

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
    padding: space.xxl,
    gap: space.md,
  },
  title: {
    fontWeight: fontWeight.semibold,
    color: t.textPrimary,
    textAlign: 'center',
  },
  message: {
    color: t.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: space.sm,
    borderRadius: radius.sm,
  },
});
