import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '@/providers/NetworkProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

export function OfflineBanner() {
  const { isOffline } = useNetwork();
  const { styles } = useThemedStyles(makeStyles);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You're offline. Changes will retry when service returns.
      </Text>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  banner: {
    backgroundColor: t.statusWarnFg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: t.onAccent,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
