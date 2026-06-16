import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

/**
 * Presentational "Subscribe to Calendar" card. The subscribe handler (which
 * opens the platform action sheet / alert) lives in the parent screen.
 *
 * `cardStyle` lets the parent set the card background (surface vs
 * surfaceVariant) so each screen keeps its exact appearance.
 */
interface CalendarSubscribeCardProps {
  onSubscribe: () => void;
  cardStyle?: ViewStyle | ViewStyle[];
}

export function CalendarSubscribeCard({ onSubscribe, cardStyle }: CalendarSubscribeCardProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

  return (
    <Card elevation={0} style={cardStyle}>
      <Card.Content>
        <View style={styles.gcalHeader}>
          <MaterialCommunityIcons name="calendar-sync" size={24} color={tokens.accent} />
          <View style={styles.gcalInfo}>
            <Text variant="bodyLarge" style={styles.gcalTitle}>Subscribe to Calendar</Text>
            <Text variant="bodySmall" style={styles.gcalSubtitle}>Add ambassador events to your calendar app. Events auto-update with RSVPs and details.</Text>
          </View>
        </View>
        <Button
          mode="contained"
          icon="calendar-plus"
          onPress={onSubscribe}
          style={styles.gcalConnectButton}
        >
          Subscribe to Calendar
        </Button>
      </Card.Content>
    </Card>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    gcalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    gcalInfo: { flex: 1 },
    gcalTitle: { fontWeight: '600' },
    gcalSubtitle: { color: t.textSecondary },
    gcalConnectButton: { borderRadius: 8 },
  });
