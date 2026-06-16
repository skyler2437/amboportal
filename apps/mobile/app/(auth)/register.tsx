import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || '';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!firstName.trim() || !lastName.trim()) return 'First and last name are required.';

    const emailLower = email.trim().toLowerCase();
    if (!emailLower) return 'Email is required.';
    if (!emailLower.includes('@') || emailLower.indexOf('@') >= emailLower.length - 1) {
      return 'Please enter a valid email address.';
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return 'Phone number must be exactly 10 digits.';

    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';

    return null;
  }

  async function handleRegister() {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const digits = phone.replace(/\D/g, '');

      const res = await fetch(`${WEB_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: trimmedEmail,
          phone: digits,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Registration Error', data.error || 'Something went wrong.');
        return;
      }

      // Account created on the server. Now sign in via Supabase client
      // so the mobile app has a proper session.
      await signIn(trimmedEmail, password);
      // AuthProvider will fetch role="basic" and root layout will route to welcome
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up with your Linfield email</Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            accessibilityLabel="First name"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            accessibilityLabel="Last name"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Email address"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number (10 digits)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          accessibilityLabel="Phone number"
        />

        <TextInput
          style={styles.input}
          placeholder="Password (8+ characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Password"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          accessibilityLabel="Confirm password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={tokens.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.back()}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.surface },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: t.textSecondary, textAlign: 'center', marginBottom: 32 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 14,
    fontSize: 16, marginBottom: 12, backgroundColor: t.surfaceVariant,
  },
  halfInput: { flex: 1 },
  button: {
    backgroundColor: t.accentSolid, borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: t.onAccent, fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', marginTop: 20, padding: 8 },
  linkText: { fontSize: 15, color: t.secondary, fontWeight: '500' },
});
