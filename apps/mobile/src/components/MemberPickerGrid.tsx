import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text, useTheme, type MD3Theme } from 'react-native-paper';
import { MemberPill, MemberPillUser } from '@/components/MemberPill';
import { space, fontWeight } from '@/lib/theme';

export type MemberUser = MemberPillUser;

interface MemberPickerGridProps {
  users: MemberUser[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Current user — never shown as a selectable pill. */
  excludeUserId?: string;
  style?: StyleProp<ViewStyle>;
}

export function MemberPickerGrid({
  users,
  selectedIds,
  onToggle,
  excludeUserId,
  style,
}: MemberPickerGridProps) {
  const paper = useTheme();
  const styles = useMemo(() => makeStyles(paper), [paper]);
  const selectedSet = new Set(selectedIds);
  const visibleUsers = excludeUserId ? users.filter((u) => u.id !== excludeUserId) : users;
  const count = visibleUsers.filter((u) => selectedSet.has(u.id)).length;

  return (
    <View style={[styles.container, style]}>
      <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {visibleUsers.map((user) => (
          <MemberPill
            key={user.id}
            user={user}
            selected={selectedSet.has(user.id)}
            onPress={() => onToggle(user.id)}
          />
        ))}
      </ScrollView>
      <Text variant="bodySmall" style={styles.count}>
        {count > 0 ? `${count} selected` : ' '}
      </Text>
    </View>
  );
}

const makeStyles = (paper: MD3Theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.lg, paddingBottom: space.sm },
    count: {
      color: paper.colors.onSurfaceVariant,
      fontWeight: fontWeight.medium,
      paddingHorizontal: space.lg,
      minHeight: 18,
    },
  });
