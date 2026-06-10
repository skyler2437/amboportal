import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface BiometricLockScreenProps {
  onUnlock: () => Promise<boolean>;
}

export function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="lock" size={48} color="#111827" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#6b7280',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
});
