import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

/**
 * Presentational Sign Out + Delete Account button block. The actual sign-out and
 * delete-account handlers (and the `deleting` flag) live in the parent screen —
 * this component only renders the controlled buttons.
 */
interface AccountActionsProps {
  onSignOut: () => void;
  onDeleteAccount: () => void;
  deleting: boolean;
}

export function AccountActions({ onSignOut, onDeleteAccount, deleting }: AccountActionsProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <>
      <Button
        mode="contained"
        buttonColor={tokens.statusBadFg}
        icon="logout"
        onPress={onSignOut}
        style={styles.signOutButton}
      >
        Sign Out
      </Button>

      <Button
        mode="text"
        textColor={tokens.statusBadFg}
        icon="delete-outline"
        onPress={onDeleteAccount}
        loading={deleting}
        disabled={deleting}
        style={styles.deleteButton}
      >
        Delete Account
      </Button>
    </>
  );
}

const makeStyles = (_t: SemanticTokens) =>
  StyleSheet.create({
    signOutButton: { borderRadius: 12 },
    deleteButton: { marginTop: 12 },
  });
