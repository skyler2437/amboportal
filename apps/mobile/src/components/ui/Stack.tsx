import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '@/lib/theme';

type GapToken = keyof typeof space;

interface StackProps {
  children: React.ReactNode;
  /** Spacing token between children. */
  gap?: GapToken;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  style?: StyleProp<ViewStyle>;
}

/** Horizontal flex container with a token gap. */
export function Row({ children, gap = 'sm', align = 'center', justify, style }: StackProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align, justifyContent: justify, gap: space[gap] }, style]}>
      {children as any}
    </View>
  );
}

/** Vertical flex container with a token gap. */
export function Stack({ children, gap = 'md', align, justify, style }: StackProps) {
  return (
    <View style={[{ flexDirection: 'column', alignItems: align, justifyContent: justify, gap: space[gap] }, style]}>
      {children as any}
    </View>
  );
}
