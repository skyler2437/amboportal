import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

export default function SuccessScreen() {
  const router = useRouter();
  const { styles, tokens } = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Check size={40} color={tokens.statusGoodFg} />
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

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: t.statusGoodBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  body: { color: t.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  card: {
    backgroundColor: t.surfaceVariant,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: t.border,
    marginBottom: 24,
  },
  cardTitle: { fontWeight: '600', marginBottom: 6 },
  cardBody: { color: t.textSecondary },
  link: { color: t.secondary, fontWeight: '500' },
  button: { borderRadius: 8 },
});
