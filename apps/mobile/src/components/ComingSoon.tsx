import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

interface ComingSoonProps {
  feature?: string;
}

export function ComingSoon({ feature = 'This feature' }: ComingSoonProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Icon source="clock-outline" size={48} color={tokens.textMuted} />
      <Text style={styles.title}>Coming Soon</Text>
      <Text style={styles.subtitle}>{feature} is under development.</Text>
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
    backgroundColor: t.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: t.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: t.textMuted,
    textAlign: 'center',
  },
});
