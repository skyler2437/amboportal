import React, { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@ambo/database/types';

const PENDING_TOKEN_KEY = 'ambo_pending_push_token';

function groupForRole(role: UserRole | null): '(admin)' | '(student)' | null {
  if (role === 'admin' || role === 'superadmin') return '(admin)';
  if (role === 'student') return '(student)';
  return null; // basic/applicant/null have no protected deep-link destination
}

// Map a known web URL to the mobile route for THIS user's role. Mapping is
// role-aware so an admin tapping e.g. a chat notification lands on
// /(admin)/chat rather than being pushed into the student group (which the
// student layout would then redirect away from, thrashing navigation).
function mapWebUrlToMobileRoute(url: string, role: UserRole | null): string {
  const base = groupForRole(role) === '(admin)' ? '/(admin)' : '/(student)';
  if (url.includes('/chat')) return `${base}/chat`;
  if (url.includes('/posts')) return `${base}/posts`;
  if (base === '/(admin)' && url.includes('/submissions')) return '/(admin)/submissions';
  return base;
}

function getProjectId(): string | null {
  if (process.env.EXPO_PUBLIC_EAS_PROJECT_ID) {
    return process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  }
  if (Constants.easConfig?.projectId) {
    return Constants.easConfig.projectId;
  }
  if (Constants.expoConfig?.extra?.eas?.projectId) {
    return Constants.expoConfig.extra.eas.projectId;
  }
  return null;
}

async function getApiBaseUrl(): Promise<string> {
  // Use EXPO_PUBLIC env var or derive from Supabase URL
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (process.env.EXPO_PUBLIC_WEB_URL) {
    return process.env.EXPO_PUBLIC_WEB_URL;
  }
  if (__DEV__) return 'http://localhost:3000';
  throw new Error('EXPO_PUBLIC_WEB_URL must be set for production builds');
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface TokenPayload {
  token: string;
  platform: string;
  device_name: string;
}

async function syncTokenToServer(payload: TokenPayload): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const baseUrl = await getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/mobile/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteTokenFromServer(token: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const baseUrl = await getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/mobile/push-token`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session, userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const currentTokenRef = useRef<string | null>(null);
  const registeredRef = useRef(false);
  // Holds a notification target that arrived before navigation settled. We
  // store the raw payload (not a resolved route) because the user's role is
  // often still null at cold-launch tap time — the concrete route is computed
  // in flushPendingRoute once the role is known.
  const pendingTargetRef = useRef<{ mobilePath?: string; url?: string } | null>(null);
  // Mirror auth/navigation state into refs so handleNotificationResponse and
  // flushPendingRoute can stay referentially stable — otherwise their dep
  // changes re-fire the cold-start listener effect and we'd handle the launch
  // tap twice.
  const sessionRef = useRef(session);
  const authLoadingRef = useRef(authLoading);
  const userRoleRef = useRef(userRole);
  const segmentsRef = useRef(segments);
  useEffect(() => {
    sessionRef.current = session;
    authLoadingRef.current = authLoading;
    userRoleRef.current = userRole;
    segmentsRef.current = segments;
  }, [session, authLoading, userRole, segments]);

  // Set foreground notification handler
  useEffect(() => {
    if (Platform.OS === 'web') return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });

    // Clear badge count when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        Notifications.setBadgeCountAsync(0).catch(() => {});
      }
    });

    // Clear badge on initial mount (app open)
    Notifications.setBadgeCountAsync(0).catch(() => {});

    return () => subscription.remove();
  }, []);

  const applyRoute = useCallback(
    (route: string) => {
      try {
        router.push(route as Parameters<typeof router.push>[0]);
      } catch {
        // Navigator not mounted yet — re-stage so the settle effect retries.
        pendingTargetRef.current = { mobilePath: route };
      }
    },
    [router]
  );

  // Apply the pending notification target, but only once it is safe to do so:
  // auth has resolved, the user has a session and a known role, AND
  // RootNavigator has already landed in that role's group. Pushing a deep
  // route before navigation settles stacks an extra push onto the cold-start
  // redirect sequence, which is what triggers the navigator update-depth loop
  // (and the "Something went wrong" ErrorBoundary screen) on notification taps.
  const flushPendingRoute = useCallback(() => {
    const target = pendingTargetRef.current;
    if (!target) return;
    if (authLoadingRef.current) return; // auth still resolving

    if (!sessionRef.current) {
      // No session — RootNavigator will route to login; drop the deep link.
      pendingTargetRef.current = null;
      return;
    }

    const group = groupForRole(userRoleRef.current);
    if (!group) {
      // null role → still resolving, so wait. A resolved basic/applicant role
      // has no protected destination → discard.
      if (userRoleRef.current !== null) pendingTargetRef.current = null;
      return;
    }

    // Wait until RootNavigator has actually navigated into the user's group
    // before pushing a nested route on top of it.
    if (segmentsRef.current[0] !== group) return;

    // Resolve the concrete route now that the role is known.
    const route = target.mobilePath
      ? target.mobilePath
      : target.url
        ? mapWebUrlToMobileRoute(target.url, userRoleRef.current)
        : null;
    pendingTargetRef.current = null;
    if (route) applyRoute(route);
  }, [applyRoute]);

  // Handle notification taps. The target is always staged and flushed by
  // flushPendingRoute so cold-launch taps (auth not yet resolved) and warm
  // taps (already settled) follow the exact same gated path.
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | { mobilePath?: string; url?: string }
        | undefined;
      if (!data?.mobilePath && !data?.url) return;
      pendingTargetRef.current = { mobilePath: data.mobilePath, url: data.url };
      flushPendingRoute();
    },
    [flushPendingRoute]
  );

  // Re-attempt the pending target whenever auth, role, or the current route
  // group changes — i.e. as the cold-start navigation settles.
  useEffect(() => {
    flushPendingRoute();
  }, [authLoading, session, userRole, segments, flushPendingRoute]);

  // Register response listener + process cold-launch tap
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Process last notification response (cold launch)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  // Register push token when session is available
  const registerPushToken = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!Device.isDevice) {
      if (__DEV__) console.log('[Push] Skipping registration on simulator/emulator');
      return;
    }

    const projectId = getProjectId();
    if (!projectId) {
      if (__DEV__) console.log('[Push] No EAS projectId configured, skipping push registration');
      return;
    }

    try {
      // Create default channel on Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('[Push] Permission not granted');
        return;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      currentTokenRef.current = token;

      const payload: TokenPayload = {
        token,
        platform: Platform.OS,
        device_name: Device.deviceName || `${Platform.OS} device`,
      };

      const synced = await syncTokenToServer(payload);
      if (!synced) {
        // Persist for retry
        await AsyncStorage.setItem(PENDING_TOKEN_KEY, JSON.stringify(payload));
        if (__DEV__) console.log('[Push] Token sync failed, persisted for retry');
      } else {
        await AsyncStorage.removeItem(PENDING_TOKEN_KEY);
      }
    } catch (err) {
      // Fetching the Expo token hits the network and can fail transiently
      // (device offline, or app backgrounded mid-launch). That's expected, so
      // swallow it rather than letting it surface as an unhandled promise
      // rejection (AMBOPORTAL-MOBILE-5). Clear the guard so a later session
      // change or relaunch can retry registration.
      registeredRef.current = false;
      if (__DEV__) console.log('[Push] Push token registration failed (will retry):', err);
    }
  }, []);

  // Retry pending token sync
  const retryPendingSync = useCallback(async () => {
    const pendingRaw = await AsyncStorage.getItem(PENDING_TOKEN_KEY);
    if (!pendingRaw) return;

    try {
      const payload: TokenPayload = JSON.parse(pendingRaw);
      const synced = await syncTokenToServer(payload);
      if (synced) {
        await AsyncStorage.removeItem(PENDING_TOKEN_KEY);
        if (__DEV__) console.log('[Push] Pending token sync succeeded');
      }
    } catch {
      // Invalid stored data
      await AsyncStorage.removeItem(PENDING_TOKEN_KEY);
    }
  }, []);

  // React to session changes
  useEffect(() => {
    if (!session) {
      // On logout, best-effort delete token
      if (currentTokenRef.current) {
        deleteTokenFromServer(currentTokenRef.current).catch(() => {
          // Don't block logout
        });
        currentTokenRef.current = null;
      }
      registeredRef.current = false;
      return;
    }

    if (!registeredRef.current) {
      registeredRef.current = true;
      registerPushToken();
      retryPendingSync();
    }
  }, [session, registerPushToken, retryPendingSync]);

  // Listen for token rotation
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addPushTokenListener(async (newToken) => {
      const token = newToken.data as string;
      currentTokenRef.current = token;

      const payload: TokenPayload = {
        token,
        platform: Platform.OS,
        device_name: Device.deviceName || `${Platform.OS} device`,
      };

      const synced = await syncTokenToServer(payload);
      if (!synced) {
        await AsyncStorage.setItem(PENDING_TOKEN_KEY, JSON.stringify(payload));
      } else {
        await AsyncStorage.removeItem(PENDING_TOKEN_KEY);
      }
    });

    return () => subscription.remove();
  }, []);

  return <>{children}</>;
}
