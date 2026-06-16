import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { UserRole } from '@ambo/database';
import { getRoleColors } from '@/lib/theme';
import { useAppTheme } from '@/lib/ThemeProvider';

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const { mode } = useAppTheme();
  const roleColors = getRoleColors(mode);
  const colors = roleColors[role] || roleColors.basic;

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.bg }]}
      accessible={true}
      accessibilityLabel={`Role: ${role}`}
      accessibilityRole="text"
    >
      <Text style={[styles.text, { color: colors.text }]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
