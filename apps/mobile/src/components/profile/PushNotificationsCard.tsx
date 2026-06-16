import React, { useMemo } from 'react';
import { View, StyleSheet, Linking, Platform, type ViewStyle } from 'react-native';
import { Card, Text, Button, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

/**
 * Presentational push-notification permission card. The permission status and
 * request handler come from the parent's `usePushNotifications` hook.
 *
 * Per-screen differences handled via props:
 *  - `cardStyle`: lets the parent set the card background (surface vs
 *    surfaceVariant) and any extra spacing, preserving each screen's look.
 *  - `defaultSubtitle`: the copy shown when permission hasn't been decided yet
 *    (student vs admin wording differs).
 */
interface PushNotificationsCardProps {
  permissionStatus: string | null | undefined;
  pushLoading: boolean;
  onRequestPermission: () => void;
  defaultSubtitle: string;
  cardStyle?: ViewStyle | ViewStyle[];
}

export function PushNotificationsCard({
  permissionStatus,
  pushLoading,
  onRequestPermission,
  defaultSubtitle,
  cardStyle,
}: PushNotificationsCardProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <Card elevation={0} style={cardStyle}>
      <Card.Content>
        <View style={styles.pushHeader}>
          <MaterialCommunityIcons name="bell-ring-outline" size={24} color={tokens.textPrimary} />
          <View style={styles.pushInfo}>
            <Text variant="bodyLarge" style={styles.pushTitle}>Push Notifications</Text>
            <Text variant="bodySmall" style={styles.pushSubtitle}>
              {permissionStatus === 'granted'
                ? 'Notifications are enabled'
                : permissionStatus === 'denied'
                ? 'Notifications are blocked in device settings'
                : defaultSubtitle}
            </Text>
          </View>
        </View>
        {pushLoading ? (
          <ActivityIndicator style={styles.pushLoader} />
        ) : permissionStatus === 'granted' ? (
          <View style={styles.pushStatus}>
            <MaterialCommunityIcons name="check-circle" size={16} color={tokens.statusGoodFg} />
            <Text variant="bodySmall" style={styles.pushStatusText}>Enabled</Text>
          </View>
        ) : permissionStatus === 'denied' ? (
          <Button
            mode="outlined"
            icon="cog"
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
            compact
          >
            Open Settings
          </Button>
        ) : (
          <Button
            mode="contained"
            icon="bell"
            onPress={onRequestPermission}
            style={styles.pushEnableButton}
          >
            Enable Notifications
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    pushHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    pushInfo: { flex: 1 },
    pushTitle: { fontWeight: '600' },
    pushSubtitle: { color: t.textSecondary },
    pushLoader: { marginVertical: 8 },
    pushStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pushStatusText: { color: t.statusGoodFg, fontWeight: '600' },
    pushEnableButton: { borderRadius: 8 },
  });
