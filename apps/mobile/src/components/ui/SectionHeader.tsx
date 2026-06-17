import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, fontWeight, type SemanticTokens } from '@/lib/theme';

interface SectionHeaderProps {
  children: React.ReactNode;
  /** 'label' = small muted section label (e.g. "SECURITY"); 'title' = larger section title. */
  variant?: 'label' | 'title';
  style?: StyleProp<TextStyle>;
}

/** Settings/detail section heading. Replaces the repeated
 * `sectionLabel` (titleSmall) and `sectionTitle` (titleMedium) styles. */
export function SectionHeader({ children, variant = 'label', style }: SectionHeaderProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <Text
      variant={variant === 'title' ? 'titleMedium' : 'titleSmall'}
      style={[variant === 'title' ? styles.title : styles.label, style]}
    >
      {children as any}
    </Text>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    label: { fontWeight: fontWeight.semibold, color: t.textSecondary, marginBottom: space.sm },
    title: { fontWeight: fontWeight.semibold, color: t.textPrimary, marginBottom: space.md },
  });
