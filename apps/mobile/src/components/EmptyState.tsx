import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

  return (
    <View style={styles.container} accessible={true} accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`} accessibilityRole="text">
      <Icon source={icon} size={48} color={tokens.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
    fontSize: 16,
    fontWeight: '600',
    color: t.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: t.textMuted,
    textAlign: 'center',
  },
});
