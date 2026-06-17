import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, type SemanticTokens } from '@/lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Bordered, rounded surface container. Replaces the repeated
 * `{ backgroundColor: surface, borderWidth, borderColor, borderRadius, padding }`. */
export function Card({ children, style }: CardProps) {
  const { styles } = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]}>{children as any}</View>;
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      padding: space.lg,
    },
  });
