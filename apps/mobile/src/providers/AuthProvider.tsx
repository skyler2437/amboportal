import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@ambo/database/types';
import type { Session } from '@supabase/supabase-js';

// Max time to wait for initial auth check before unblocking the UI as a
// safety net against a hung getSession(). 4s was too aggressive — on slow
// networks getSession() can legitimately take 5–8s on cold start, and
// timing out early flips state to {session: null, isLoading: false} which
// causes RootNavigator to redirect to login (and a notification-deferred
// route to be discarded). 10s gives genuine slow networks room to resolve
// while still bailing on a true hang.
const AUTH_TIMEOUT_MS = 10000;
// Max time to wait for a sign-in attempt before aborting
const SIGN_IN_TIMEOUT_MS = 20000;

interface AuthState {
  session: Session | null;
  userRole: UserRole | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    userRole: null,
    isLoading: true,
  });
  const initialAuthResolved = useRef(false);

  useEffect(() => {
    // Timeout: unblock the UI if auth takes too long (cold-start hang fix).
    // The onAuthStateChange listener below will still update state if the
    // session resolves after the timeout, so the user won't be locked out.
    const timeout = setTimeout(() => {
      if (!initialAuthResolved.current) {
        initialAuthResolved.current = true;
        setState(prev => {
          if (prev.isLoading) {
            return { ...prev, isLoading: false };
          }
          return prev;
        });
      }
    }, AUTH_TIMEOUT_MS);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (initialAuthResolved.current) return; // timeout already fired
      initialAuthResolved.current = true;
      clearTimeout(timeout);

      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth changes — this keeps working even after a timeout,
    // so a late-arriving session still logs the user in.
    // IMPORTANT: Do NOT await inside this callback — it can block
    // signInWithPassword from resolving its promise.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          fetchUserRole(session.user.id).catch(err => {
            if (__DEV__) console.error('[Auth] onAuthStateChange fetchUserRole error:', err);
          });
        } else {
          setState({ session: null, userRole: null, isLoading: false });
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchUserRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', userId)
        .single();

      if (error) {
        if (__DEV__) console.error('[Auth] fetchUserRole error:', error.message);
      }

      const session = (await supabase.auth.getSession()).data.session;

      // Keep users.email in sync with the Auth email (source of truth).
      // This auto-corrects any drift caused by the Auth confirmation flow:
      // when a user requests an email change, users.email may have been
      // updated optimistically while auth.users.email hasn't confirmed yet.
      //
      // We call a server-side API route (admin client) instead of updating
      // directly, because the RLS UPDATE policy on users requires
      // is_admin_user() — which looks up by email and fails when the emails
      // are already out of sync (chicken-and-egg).
      if (!error && session?.user?.email && data.email !== session.user.email) {
        if (__DEV__) {
          console.log('[Auth] Syncing users.email from Auth:', session.user.email);
        }
        const baseUrl = process.env.EXPO_PUBLIC_WEB_URL;
        if (baseUrl) {
          try {
            const res = await fetch(`${baseUrl}/api/mobile/sync-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            if (__DEV__) {
              const body = await res.json().catch(() => ({}));
              console.log('[Auth] sync-email response:', res.status, body);
            }
          } catch (err) {
            if (__DEV__) console.error('[Auth] sync-email failed:', err);
          }
        }
      }

      setState({
        session,
        userRole: error ? null : (data.role as UserRole),
        isLoading: false,
      });
    } catch (err) {
      if (__DEV__) console.error('[Auth] fetchUserRole unexpected error:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }

  async function signIn(email: string, password: string) {
    const result = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sign-in timed out. Please check your connection and try again.')), SIGN_IN_TIMEOUT_MS)
      ),
    ]);
    if (result.error) throw result.error;

    // Directly fetch role instead of relying on onAuthStateChange,
    // which can race against the client's internal session propagation.
    if (result.data?.session) {
      await fetchUserRole(result.data.session.user.id);
    }
  }

  async function signInWithApple() {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token returned from Apple');
    }

    const { error, data } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) throw error;

    // Apple only sends the name on the first sign-in — persist it if available
    if (credential.fullName && data.session) {
      const firstName = credential.fullName.givenName;
      const lastName = credential.fullName.familyName;
      if (firstName || lastName) {
        await supabase
          .from('users')
          .update({
            ...(firstName ? { first_name: firstName } : {}),
            ...(lastName ? { last_name: lastName } : {}),
          })
          .eq('id', data.session.user.id);
      }
    }

    if (data.session) {
      await fetchUserRole(data.session.user.id);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setState({ session: null, userRole: null, isLoading: false });
  }

  async function refreshRole() {
    const session = (await supabase.auth.getSession()).data.session;
    if (session) {
      await fetchUserRole(session.user.id);
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signInWithApple, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// Safe fallback returned by useAuth() when no AuthProvider is an ancestor.
//
// react-native-screens (RN 0.83+) renders a screen's subtree in a detached
// pass that is hosted OUTSIDE our provider tree. Calling useAuth() during that
// pass previously threw "useAuth must be used within an AuthProvider" and
// crashed the app on the way into the student/admin dashboards and the welcome
// screen (any screen that reads auth). Returning a "still loading" value lets
// every screen fall into its loading / no-session branch during that throwaway
// pass, while the real in-tree render supplies the true auth state.
//
// isLoading:true is deliberate — redirect effects (RootNavigator, index.tsx)
// all guard on `if (isLoading) return`, so they will not fire with a spurious
// null session during the detached pass. The signIn/out helpers are only ever
// invoked from user-event handlers on the real render, so these throwing stubs
// should never run in practice.
const DEFAULT_AUTH: AuthContextType = {
  session: null,
  userRole: null,
  isLoading: true,
  signIn: async () => {
    throw new Error('useAuth: AuthProvider is not mounted');
  },
  signInWithApple: async () => {
    throw new Error('useAuth: AuthProvider is not mounted');
  },
  signOut: async () => {
    throw new Error('useAuth: AuthProvider is not mounted');
  },
  refreshRole: async () => {
    throw new Error('useAuth: AuthProvider is not mounted');
  },
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    if (__DEV__) {
      console.log(
        '[useAuth] No AuthContext (react-native-screens detached render) — using loading fallback'
      );
    }
    return DEFAULT_AUTH;
  }
  return context;
}
