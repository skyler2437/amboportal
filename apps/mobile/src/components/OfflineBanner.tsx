import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '@/providers/NetworkProvider';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

export function OfflineBanner() {
  const { isOffline } = useNetwork();
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

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
