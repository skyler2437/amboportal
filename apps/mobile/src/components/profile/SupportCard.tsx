import React from 'react';
import { StyleSheet, Pressable, Linking, type ViewStyle } from 'react-native';
import { Card, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { openExternalLink } from '@/lib/openExternalLink';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

/**
 * Presentational support/about card: Contact Support, Privacy Policy, Terms of
 * Service rows. Each row only opens an external URL — no parent state involved —
 * so the navigation handlers live here.
 *
 * `cardStyle` lets the parent set the card background (surface vs
 * surfaceVariant) so each screen keeps its exact appearance.
 */
interface SupportCardProps {
  cardStyle?: ViewStyle | ViewStyle[];
}

export function SupportCard({ cardStyle }: SupportCardProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

  return (
    <Card elevation={0} style={cardStyle}>
      <Card.Content style={styles.supportContent}>
        <Pressable style={styles.supportRow} onPress={() => Linking.openURL('mailto:support@127makes.com')}>
          <MaterialCommunityIcons name="email-outline" size={20} color={tokens.textSecondary} />
          <Text variant="bodyMedium">Contact Support</Text>
        </Pressable>
        <Pressable
          style={styles.supportRow}
          onPress={() => {
            const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://amboportal.vercel.app';
            openExternalLink(`${webUrl}/privacy`);
          }}
        >
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color={tokens.textSecondary} />
          <Text variant="bodyMedium">Privacy Policy</Text>
        </Pressable>
        <Pressable
          style={styles.supportRow}
          onPress={() => {
            const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://amboportal.vercel.app';
            openExternalLink(`${webUrl}/terms`);
          }}
        >
          <MaterialCommunityIcons name="file-document-outline" size={20} color={tokens.textSecondary} />
          <Text variant="bodyMedium">Terms of Service</Text>
        </Pressable>
      </Card.Content>
    </Card>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    supportContent: { gap: 0 },
    supportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  });
