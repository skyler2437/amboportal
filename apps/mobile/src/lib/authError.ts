import { supabase } from './supabase';

// Patterns matched against the lower-cased error message.
const AUTH_ERROR_PATTERNS = [
  'jwt expired',
  'jwt is expired',
  'invalid jwt',
  'invalid token',
  'token has invalid claims',
  'refresh_token_not_found',
  'invalid refresh token',
  'no session',
  'session not found',
  'auth session missing',
];

type ErrorLike = { message?: unknown; code?: unknown; status?: unknown };

export function isAuthError(err: unknown): boolean {
  if (!err) return false;
  const e = err as ErrorLike;

  if (e.status === 401) return true;
  // Postgrest emits PGRST301 for JWT-expired and similar auth failures.
  if (e.code === 'PGRST301') return true;

  const raw =
    typeof e.message === 'string'
      ? e.message
      : typeof err === 'string'
        ? err
        : '';
  const msg = raw.toLowerCase();
  if (!msg) return false;

  return AUTH_ERROR_PATTERNS.some((p) => msg.includes(p));
}

/**
 * If `err` is auth-related (expired JWT, invalid refresh token, etc.), sign
 * the user out so AuthProvider's listener clears state and the root navigator
 * sends them to login. Returns true if it handled the error.
 */
export function handleAuthError(err: unknown): boolean {
  if (!isAuthError(err)) return false;
  void supabase.auth.signOut().catch(() => {
    /* swallow — listener will reconcile state on next event */
  });
  return true;
}
