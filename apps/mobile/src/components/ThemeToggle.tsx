import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, SegmentedButtons } from 'react-native-paper';
import { useThemeStore, type ThemePref } from '@/stores/themeStore';
import { useAppTheme } from '@/lib/ThemeProvider';

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: 'cellphone' },
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
];

/**
 * App appearance picker (System / Light / Dark). Writes to the persisted theme
 * preference; 'system' follows the OS. Lives in each profile's settings.
 */
export function ThemeToggle() {
  const pref = useThemeStore((s) => s.pref);
  const setPref = useThemeStore((s) => s.setPref);
  const { tokens } = useAppTheme();

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="bodyMedium" style={styles.title}>
          Appearance
        </Text>
        <Text variant="bodySmall" style={[styles.subtitle, { color: tokens.textSecondary }]}>
          Choose how the app looks. System follows your device setting.
        </Text>
        <SegmentedButtons
          value={pref}
          onValueChange={(v) => setPref(v as ThemePref)}
          buttons={OPTIONS}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  title: { fontWeight: '600', marginBottom: 2 },
  subtitle: { marginBottom: 12 },
});
