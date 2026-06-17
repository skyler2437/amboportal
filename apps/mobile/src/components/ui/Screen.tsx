import React from 'react';
import { View, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, type SemanticTokens } from '@/lib/theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (with keyboard-persist taps). */
  scroll?: boolean;
  /** Apply standard screen padding (space.lg). */
  padded?: boolean;
  /** Base background token. */
  background?: 'background' | 'surface';
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/** Full-height screen container with a themed background. Replaces the
 * `container: { flex: 1, backgroundColor }` style repeated across screens. */
export function Screen({
  children,
  scroll,
  padded,
  background = 'background',
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { styles } = useThemedStyles(makeStyles);
  const bg = background === 'surface' ? styles.surface : styles.base;

  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex, bg, style]}
        contentContainerStyle={[padded && styles.padded, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children as any}
      </ScrollView>
    );
  }
  return <View style={[styles.flex, bg, padded && styles.padded, style]}>{children as any}</View>;
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    base: { backgroundColor: t.background },
    surface: { backgroundColor: t.surface },
    padded: { padding: space.lg },
  });
