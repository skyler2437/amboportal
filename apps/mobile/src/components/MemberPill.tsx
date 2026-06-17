import React, { useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Avatar, Text, useTheme, type MD3Theme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/ThemeProvider';
import { getInitials } from '@/lib/format';
import { space, radius, fontSize, fontWeight, type SemanticTokens } from '@/lib/theme';

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
  const paper = useTheme();
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(paper, tokens), [paper, tokens]);
  const initials = getInitials(user.first_name, user.last_name);
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
          <MaterialCommunityIcons name="check" size={15} color={tokens.onAccent} />
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
          color={paper.colors.primary}
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

const makeStyles = (paper: MD3Theme, tokens: SemanticTokens) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      borderRadius: radius.pill,
      paddingVertical: space.sm,
      paddingHorizontal: space.lg,
      paddingLeft: space.sm,
    },
    pillSelected: { backgroundColor: paper.colors.primary },
    pillUnselected: {
      backgroundColor: paper.colors.surface,
      borderWidth: 1,
      borderColor: paper.colors.outline,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: radius.md,
      backgroundColor: tokens.onAccentOverlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: { backgroundColor: paper.colors.primaryContainer },
    initialsLabel: { fontSize: fontSize.xxs },
    name: { fontSize: fontSize.md },
    nameSelected: { color: tokens.onAccent, fontWeight: fontWeight.medium },
    nameUnselected: { color: paper.colors.onSurface },
  });
