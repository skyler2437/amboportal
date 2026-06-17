import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, fontSize, fontWeight, type SemanticTokens } from '@/lib/theme';

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
    padding: space.xxl,
    gap: space.md,
    backgroundColor: t.surface,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: t.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: t.textMuted,
    textAlign: 'center',
  },
});
