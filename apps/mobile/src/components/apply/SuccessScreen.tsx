import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function SuccessScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Check size={40} color="#16a34a" />
      </View>
      <Text variant="headlineSmall" style={styles.title}>You did it!</Text>
      <Text variant="bodyMedium" style={styles.body}>
        Your Student Ambassador Application has been successfully submitted. The Student Ambassador
        Coordinator will email you after the Round 1 Deadline whether you've passed onto Round 2 or not.
      </Text>

      <View style={styles.card}>
        <Text variant="titleSmall" style={styles.cardTitle}>Questions?</Text>
        <Text variant="bodyMedium" style={styles.cardBody}>
          Contact the Student Ambassador Coordinator, Skyler Stevens, at{' '}
        </Text>
        <Text
          variant="bodyMedium"
          style={styles.link}
          onPress={() => Linking.openURL('mailto:sstevens@linfield.com')}
        >
          sstevens@linfield.com
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={() => router.replace('/(auth)/login')}
        style={styles.button}
      >
        Back to Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  body: { color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  cardTitle: { fontWeight: '600', marginBottom: 6 },
  cardBody: { color: '#6b7280' },
  link: { color: '#6366f1', fontWeight: '500' },
  button: { borderRadius: 8 },
});
