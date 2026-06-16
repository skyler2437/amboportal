import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  signingOut: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, signingOut: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, signingOut: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Forward to Sentry so render-time / lifecycle errors are visible in dashboards.
    // The componentStack context lets Sentry render the React tree where the throw happened.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack ?? '' } },
    });
    if (__DEV__) {
      console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, signingOut: false });
  };

  // Escape hatch when the same render keeps throwing — e.g. a stale session
  // is causing a child to crash on mount. Signing out clears AuthProvider
  // state so RootNavigator routes to login on the next render.
  private handleSignOut = async () => {
    this.setState({ signingOut: true });
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — onAuthStateChange will reconcile on next event
    }
    this.setState({ hasError: false, error: null, signingOut: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <ErrorFallback
          error={this.state.error}
          signingOut={this.state.signingOut}
          onReset={this.handleReset}
          onSignOut={this.handleSignOut}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  signingOut: boolean;
  onReset: () => void;
  onSignOut: () => void;
}

function ErrorFallback({ error, signingOut, onReset, onSignOut }: ErrorFallbackProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Icon source="alert-circle-outline" size={64} color={tokens.statusBadFg} />
        <Text variant="headlineSmall" style={styles.title}>
          Something went wrong
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          The app encountered an unexpected error. Please try again.
        </Text>
        {__DEV__ && error && (
          <View style={styles.errorDetails}>
            <Text variant="labelSmall" style={styles.errorText}>
              {error.message}
            </Text>
          </View>
        )}
        <Button
          mode="contained"
          icon="refresh"
          onPress={onReset}
          style={styles.button}
          disabled={signingOut}
        >
          Try Again
        </Button>
        <Button
          mode="text"
          icon="logout"
          onPress={onSignOut}
          style={styles.secondaryButton}
          loading={signingOut}
          disabled={signingOut}
        >
          Sign out and restart
        </Button>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 16,
    },
    title: {
      fontWeight: '700',
      color: t.textPrimary,
      textAlign: 'center',
    },
    message: {
      color: t.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    errorDetails: {
      backgroundColor: t.statusBadBg,
      borderRadius: 8,
      padding: 12,
      width: '100%',
    },
    errorText: {
      color: t.statusBadFg,
      fontFamily: 'monospace',
    },
    button: {
      marginTop: 8,
      borderRadius: 12,
    },
    secondaryButton: {
      marginTop: 4,
      borderRadius: 12,
    },
  });
