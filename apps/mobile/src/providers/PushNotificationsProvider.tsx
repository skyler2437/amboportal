import React, { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';

const PENDING_TOKEN_KEY = 'ambo_pending_push_token';

// Map known web URLs to mobile routes
function mapWebUrlToMobileRoute(url: string): string {
  if (url.includes('/student/chat') || url.includes('/chat')) return '/(student)/chat';
  if (url.includes('/student/posts')) return '/(student)/posts';
  if (url.includes('/admin/posts')) return '/(admin)/posts';
  if (url.includes('/admin/submissions')) return '/(admin)/submissions';
  if (url.includes('/admin')) return '/(admin)';
  if (url.includes('/student')) return '/(student)';
  return '/(student)';
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
  const { session, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const currentTokenRef = useRef<string | null>(null);
  const registeredRef = useRef(false);
  // Holds a notification-driven route that arrived before auth resolved.
  // Applied (or discarded) by the effect below once we know the session.
  const pendingRouteRef = useRef<string | null>(null);
  // Mirror auth state into refs so handleNotificationResponse can stay
  // referentially stable — otherwise its dep change re-fires the cold-start
  // listener effect and we'd handle the launch tap twice.
  const sessionRef = useRef(session);
  const authLoadingRef = useRef(authLoading);
  useEffect(() => {
    sessionRef.current = session;
    authLoadingRef.current = authLoading;
  }, [session, authLoading]);

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
        router.push(route as any);
      } catch {
        // Navigator not mounted yet — keep the route pending so the auth
        // effect re-applies it on the next render.
        pendingRouteRef.current = route;
      }
    },
    [router]
  );

  // Handle notification taps. We never push to a protected route until auth
  // has resolved with a valid session — otherwise the destination screen can
  // mount with no session, fire a stale-JWT query, and surface the inline
  // "Try Again" error state with no path to recover.
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | { mobilePath?: string; url?: string }
        | undefined;

      let route: string | null = null;

      if (data?.mobilePath) {
        route = data.mobilePath;
      } else if (data?.url) {
        route = mapWebUrlToMobileRoute(data.url);
      }

      if (!route) return;

      if (!authLoadingRef.current && sessionRef.current) {
        applyRoute(route);
      } else {
        // Defer until auth resolves; the effect below picks it up.
        pendingRouteRef.current = route;
      }
    },
    [applyRoute]
  );

  // Apply (or discard) a deferred notification route once auth resolves.
  // If the user has no session, RootNavigator will route them to login —
  // we drop the pending route rather than fight that redirect.
  useEffect(() => {
    if (authLoading) return;
    const pending = pendingRouteRef.current;
    if (!pending) return;
    pendingRouteRef.current = null;
    if (session) applyRoute(pending);
  }, [authLoading, session, applyRoute]);

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
