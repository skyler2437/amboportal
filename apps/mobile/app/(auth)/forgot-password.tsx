import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';

export default function ForgotPasswordScreen() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${WEB_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.description}>
          If an account exists with that email, you'll receive a password reset link shortly.
        </Text>
        <Text style={styles.description}>
          Open the link in your email to set a new password. The link will open in your web browser.
        </Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setSent(false);
            setEmail('');
          }}
        >
          <Text style={styles.secondaryButtonText}>Send Again</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.description}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
          accessibilityLabel="Email address"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12, color: t.textPrimary },
  description: {
    fontSize: 15,
    color: t.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 14,
    fontSize: 16, marginBottom: 12, backgroundColor: t.surfaceVariant, color: t.textPrimary,
  },
  button: {
    backgroundColor: t.accentSolid, borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: t.onAccent, fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: t.secondary,
    fontWeight: '500',
  },
});
