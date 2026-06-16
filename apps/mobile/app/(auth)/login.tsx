import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/providers/AuthProvider';
import { CheddarRain } from '@/components/CheddarRain';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn, signInWithApple } = useAuth();
  const { styles } = useThemedStyles(makeStyles);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cheddarActive, setCheddarActive] = useState(false);

  useEffect(() => {
    // Log Supabase config on mount to aid debugging
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (__DEV__) {
      console.log('[Login] Supabase URL configured:', url ? url.substring(0, 30) + '...' : 'MISSING');
      console.log('[Login] Supabase anon key configured:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'yes' : 'MISSING');
    }
  }, []);

  async function handleLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Login Error', 'Please enter both email and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Login Error', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    if (__DEV__) console.log('[Login] Attempting sign-in for:', trimmedEmail);
    try {
      await signIn(trimmedEmail, password);
      if (__DEV__) console.log('[Login] signIn resolved successfully');
    } catch (error: any) {
      if (__DEV__) console.error('[Login] signIn error:', error.message);
      Alert.alert('Login Error', error.message);
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
        <CheddarRain isActive={cheddarActive} onComplete={() => setCheddarActive(false)} />

        <Text style={styles.title}>AmboPortal</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Password"
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotPasswordButton}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={styles.appleButton}
              onPress={async () => {
                try {
                  await signInWithApple();
                } catch (error: any) {
                  if (error.code === 'ERR_REQUEST_CANCELED') return;
                  Alert.alert('Sign In Error', error.message || 'Apple sign-in failed');
                }
              }}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.createAccountButton}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.createAccountText}>Create an Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cheddarButton}
          onPress={() => setCheddarActive(true)}
          disabled={cheddarActive}
        >
          <Text style={styles.cheddarText}>Feeling Cheddar? 🧀</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: t.textSecondary, textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 14,
    fontSize: 16, marginBottom: 12, backgroundColor: t.surface,
  },
  button: {
    backgroundColor: t.accentSolid, borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: t.onAccent, fontSize: 16, fontWeight: '600' },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: t.secondary,
  },
  createAccountButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },
  createAccountText: {
    fontSize: 15,
    color: t.secondary,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: t.textMuted,
    textTransform: 'uppercase',
  },
  appleButton: {
    height: 50,
    width: '100%',
  },
  cheddarButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  cheddarText: {
    fontSize: 14,
    color: t.textMuted,
  },
});
