import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/lib/supabase';

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
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Icon source="alert-circle-outline" size={64} color="#ef4444" />
            <Text variant="headlineSmall" style={styles.title}>
              Something went wrong
            </Text>
            <Text variant="bodyMedium" style={styles.message}>
              The app encountered an unexpected error. Please try again.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text variant="labelSmall" style={styles.errorText}>
                  {this.state.error.message}
                </Text>
              </View>
            )}
            <Button
              mode="contained"
              icon="refresh"
              onPress={this.handleReset}
              style={styles.button}
              disabled={this.state.signingOut}
            >
              Try Again
            </Button>
            <Button
              mode="text"
              icon="logout"
              onPress={this.handleSignOut}
              style={styles.secondaryButton}
              loading={this.state.signingOut}
              disabled={this.state.signingOut}
            >
              Sign out and restart
            </Button>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#374151',
    textAlign: 'center',
  },
  message: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  errorText: {
    color: '#991b1b',
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
