import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

export interface MemberPillUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  role: string;
}

interface MemberPillProps {
  user: MemberPillUser;
  selected: boolean;
  onPress: () => void;
}

export function MemberPill({ user, selected, onPress }: MemberPillProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  const name = `${user.first_name} ${user.last_name}`.trim();
  const showImage = !!user.avatar_url && !imageFailed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
      style={[styles.pill, selected ? styles.pillSelected : styles.pillUnselected]}
    >
      {selected ? (
        <View style={styles.checkCircle}>
          <MaterialCommunityIcons name="check" size={15} color="#fff" />
        </View>
      ) : showImage ? (
        <Avatar.Image
          size={24}
          source={{ uri: user.avatar_url as string }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Avatar.Text
          size={24}
          label={initials}
          color={theme.colors.primary}
          labelStyle={styles.initialsLabel}
          style={styles.initials}
        />
      )}
      <Text
        variant="bodyMedium"
        style={[styles.name, selected ? styles.nameSelected : styles.nameUnselected]}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    paddingLeft: 7,
  },
  pillSelected: { backgroundColor: theme.colors.primary },
  pillUnselected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { backgroundColor: theme.colors.primaryContainer },
  initialsLabel: { fontSize: 11 },
  name: { fontSize: 14 },
  nameSelected: { color: '#fff', fontWeight: '500' },
  nameUnselected: { color: theme.colors.onSurface },
});
