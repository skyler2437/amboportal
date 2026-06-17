import React from 'react';
import { StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, type SemanticTokens } from '@/lib/theme';

interface FabProps {
  icon: string;
  onPress: () => void;
  /** Accessibility label (and intent description). */
  label?: string;
}

/** Bottom-right floating action button in brand color. Replaces the repeated
 * absolutely-positioned `fab` style. */
export function Fab({ icon, onPress, label }: FabProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);
  return (
    <FAB icon={icon} color={tokens.onAccent} style={styles.fab} onPress={onPress} accessibilityLabel={label} />
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      right: space.lg,
      bottom: space.lg,
      backgroundColor: t.accentSolid,
      borderRadius: radius.lg,
    },
  });
