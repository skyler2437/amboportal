import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { PushNotificationsProvider } from '@/providers/PushNotificationsProvider';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BiometricLockScreen } from '@/components/BiometricLockScreen';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { validateEnv } from '@/lib/env';
import { useChatReadStore } from '@/stores/chatReadStore';
import { theme } from '@/lib/theme';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  tracesSampleRate: 0.1,
  enableAutoSessionTracking: true,
});

// Run at module load — safe now that validateEnv only warns (never throws)
validateEnv();

// Kick off async hydration of persisted chat read state
useChatReadStore.getState().hydrate();

function RootNavigator() {
  const { session, userRole, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  // Remember the last destination we redirected to. Keyed on the *target*
  // route rather than a boolean flag so we never re-issue the same replace
  // while the segments catch up — and so a transient change in the `session`
  // object reference (a fresh object is produced on every role refetch) can't
  // retrigger navigation. This prevents the redirect ping-pong that remounts
  // the navigator in a loop ("Maximum update depth exceeded").
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const inStudentGroup = segments[0] === '(student)';

    // Resolve where the user *should* be, given the current auth state.
    let target: string | null = null;
    if (!session) {
      if (!inAuthGroup) target = '/(auth)/login';
    } else if (userRole === 'admin' || userRole === 'superadmin') {
      if (!inAdminGroup) target = '/(admin)';
    } else if (userRole === 'basic' || userRole === 'applicant') {
      // Route to welcome screen; if already in auth group on welcome, skip
      const onWelcome = inAuthGroup && segments[1] === 'welcome';
      if (!onWelcome) target = '/(auth)/welcome';
    } else if (userRole === 'student') {
      if (!inStudentGroup) target = '/(student)';
    }
    // userRole === null while a session exists means the role is still
    // resolving (or a transient fetch error). Deliberately do NOT redirect in
    // that window — wait for a definitive role so we don't bounce the user
    // between login/dashboard and remount the navigation tree in a loop.

    if (!target) {
      lastTargetRef.current = null;
      return;
    }
    if (lastTargetRef.current === target) return;
    lastTargetRef.current = target;
    router.replace(target as Parameters<typeof router.replace>[0]);
  }, [session, userRole, isLoading, segments, router]);

  return (
    <>
      <OfflineBanner />
      <Slot />
    </>
  );
}

function BiometricGate({ children }: { children: React.ReactNode }) {
  const { isLocked, unlock } = useBiometricLock();

  if (isLocked) {
    return <BiometricLockScreen onUnlock={unlock} />;
  }

  return <>{children}</>;
}

function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <KeyboardProvider>
          <PaperProvider theme={theme}>
            <NetworkProvider>
              <PushNotificationsProvider>
                <BiometricGate>
                  <RootNavigator />
                </BiometricGate>
              </PushNotificationsProvider>
            </NetworkProvider>
          </PaperProvider>
        </KeyboardProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
