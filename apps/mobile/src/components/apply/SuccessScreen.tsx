import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, fontWeight, type SemanticTokens } from '@/lib/theme';

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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  iconCircle: {
    width: 80,
    height: 80,
    // eslint-disable-next-line no-restricted-syntax -- intentional
    borderRadius: 40,
    backgroundColor: t.statusGoodBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.xl,
  },
  title: { fontWeight: fontWeight.bold, marginBottom: space.md, textAlign: 'center' },
  body: { color: t.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: space.xl },
  card: {
    backgroundColor: t.surfaceVariant,
    borderRadius: radius.md,
    padding: space.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: t.border,
    marginBottom: space.xl,
  },
  cardTitle: { fontWeight: fontWeight.semibold, marginBottom: space.sm },
  cardBody: { color: t.textSecondary },
  link: { color: t.secondary, fontWeight: fontWeight.medium },
  button: { borderRadius: radius.sm },
});
