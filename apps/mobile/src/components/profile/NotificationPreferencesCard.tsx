import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Card, Text, Divider, Switch } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, type SemanticTokens } from '@/lib/theme';
import type { NotificationPreferences } from '@/hooks/useNotificationPreferences';

/**
 * Presentational notification-type preference toggles. `prefs` and `updatePref`
 * come from the parent's `useNotificationPreferences` hook.
 *
 * `cardStyle` lets the parent set the card background (surface vs
 * surfaceVariant) so each screen keeps its exact appearance.
 */
interface NotificationPreferencesCardProps {
  prefs: NotificationPreferences;
  updatePref: (key: keyof NotificationPreferences, value: boolean) => void;
  cardStyle?: ViewStyle | ViewStyle[];
}

export function NotificationPreferencesCard({
  prefs,
  updatePref,
  cardStyle,
}: NotificationPreferencesCardProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

  return (
    <Card elevation={0} style={cardStyle}>
      <Card.Content style={styles.prefsContent}>
        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <MaterialCommunityIcons name="chat-outline" size={20} color={tokens.textSecondary} />
            <Text variant="bodyMedium">Chat Messages</Text>
          </View>
          <Switch
            value={prefs.chat_messages}
            onValueChange={(v) => updatePref('chat_messages', v)}
          />
        </View>
        <Divider />
        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <MaterialCommunityIcons name="message-text-outline" size={20} color={tokens.textSecondary} />
            <Text variant="bodyMedium">New Posts</Text>
          </View>
          <Switch
            value={prefs.new_posts}
            onValueChange={(v) => updatePref('new_posts', v)}
          />
        </View>
        <Divider />
        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <MaterialCommunityIcons name="comment-text-outline" size={20} color={tokens.textSecondary} />
            <Text variant="bodyMedium">Comments on My Posts</Text>
          </View>
          <Switch
            value={prefs.post_comments}
            onValueChange={(v) => updatePref('post_comments', v)}
          />
        </View>
        <Divider />
        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <MaterialCommunityIcons name="calendar-text-outline" size={20} color={tokens.textSecondary} />
            <Text variant="bodyMedium">Event Comments</Text>
          </View>
          <Switch
            value={prefs.event_comments}
            onValueChange={(v) => updatePref('event_comments', v)}
          />
        </View>
        <Divider />
        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <MaterialCommunityIcons name="bell-alert-outline" size={20} color={tokens.textSecondary} />
            <Text variant="bodyMedium">Event Reminders</Text>
          </View>
          <Switch
            value={prefs.event_reminders}
            onValueChange={(v) => updatePref('event_reminders', v)}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    prefsContent: { gap: space.xs },
    prefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space.sm,
    },
    prefInfo: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  });
