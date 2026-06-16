import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

interface BiometricLockScreenProps {
  onUnlock: () => Promise<boolean>;
}

export function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="lock" size={48} color={tokens.textPrimary} />
      <Text variant="headlineSmall" style={styles.title}>
        AmboPortal Locked
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Authenticate to continue
      </Text>
      <Button
        mode="contained"
        onPress={onUnlock}
        style={styles.button}
        accessibilityLabel="Unlock with biometrics"
      >
        Unlock
      </Button>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 12,
    },
    title: {
      fontWeight: '700',
      marginTop: 8,
    },
    subtitle: {
      color: t.textSecondary,
    },
    button: {
      marginTop: 16,
      borderRadius: 8,
    },
  });
