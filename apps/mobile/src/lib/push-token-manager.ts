import { supabase } from '@/lib/supabase';

// Push-token sync/delete lives outside PushNotificationsProvider so that
// AuthProvider.signOut can unregister the device token while the Supabase
// access token is still valid. (The provider's session-null effect runs
// after sign-out, when getAccessToken() already returns null — the DELETE
// would silently never reach the server and the device would keep
// receiving the previous user's notifications.)

export interface TokenPayload {
  token: string;
  platform: string;
  device_name: string;
}

let currentPushToken: string | null = null;

export function setCurrentPushToken(token: string | null) {
  currentPushToken = token;
}

export function getCurrentPushToken(): string | null {
  return currentPushToken;
}

function getApiBaseUrl(): string {
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

export async function syncTokenToServer(payload: TokenPayload): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/mobile/push-token`, {
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

export async function deleteTokenFromServer(token: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/mobile/push-token`, {
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

/**
 * Best-effort server-side unregistration of this device's push token.
 * Must be called BEFORE supabase.auth.signOut() so the request can still
 * authenticate. Never throws — sign-out must not be blocked.
 */
export async function unregisterCurrentPushToken(): Promise<void> {
  const token = currentPushToken;
  if (!token) return;
  try {
    await deleteTokenFromServer(token);
  } catch {
    // Best effort only
  }
  currentPushToken = null;
}
