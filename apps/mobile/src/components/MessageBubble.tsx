import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Avatar, Icon, Text } from 'react-native-paper';
import type { MessageStatus } from '@/hooks/useChatMessages';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, fontSize, fontWeight, type SemanticTokens } from '@/lib/theme';

interface MessageBubbleProps {
  content: string;
  createdAt: string;
  senderName: string;
  senderAvatar?: string;
  isOwn: boolean;
  status?: MessageStatus;
  onRetry?: () => void;
  likeCount?: number;
  liked?: boolean;
  onToggleLike?: () => void;
}

export function MessageBubble({ content, createdAt, senderName, senderAvatar, isOwn, status, onRetry, likeCount = 0, liked = false, onToggleLike }: MessageBubbleProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);
  const time = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const isFailed = status === 'failed';
  const isSending = status === 'sending';

  const lastTap = React.useRef(0);
  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onToggleLike?.();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <View
      style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}
      accessible={true}
      accessibilityLabel={`${isOwn ? 'You' : senderName} said: ${content}, at ${time}`}
      accessibilityRole="text"
    >
      {!isOwn && (
        <View style={styles.avatarCol}>
          {senderAvatar ? (
            <Avatar.Image size={28} source={{ uri: senderAvatar }} />
          ) : (
            <Avatar.Text size={28} label={initials} style={styles.avatarFallback} labelStyle={{ fontSize: fontSize.xxs }} />
          )}
        </View>
      )}
      <View style={styles.messageCol}>
        {!isOwn && (
          <Text variant="labelSmall" style={styles.senderName}>{senderName}</Text>
        )}
        <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="Double tap to like message">
          <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble, isFailed && styles.failedBubble]}>
            <Text variant="bodyMedium" style={isOwn ? styles.ownText : styles.otherText}>
              {content}
            </Text>
          </View>
          {likeCount > 0 && (
            <View style={[styles.likeBadge, isOwn ? styles.likeBadgeOwn : styles.likeBadgeOther]}>
              <Icon
                source={liked ? 'heart' : 'heart-outline'}
                size={12}
                color={liked ? tokens.statusBadFg : tokens.textMuted}
              />
              <Text style={styles.likeBadgeText}>{likeCount}</Text>
            </View>
          )}
        </Pressable>
        <View style={[styles.metaRow, isOwn ? styles.ownMeta : styles.otherMeta]}>
          {isFailed ? (
            <Pressable onPress={onRetry} hitSlop={8}>
              <Text variant="bodySmall" style={styles.failedText}>Failed · Tap to retry</Text>
            </Pressable>
          ) : (
            <>
              <Text variant="bodySmall" style={styles.timeOutside}>{time}</Text>
              {isOwn && isSending && (
                <Text variant="bodySmall" style={styles.statusText}>Sending…</Text>
              )}
              {isOwn && status === 'sent' && (
                <Text variant="bodySmall" style={styles.statusText}>Sent</Text>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/** Renders a date separator header between message groups */
export function DateSeparator({ date }: { date: string }) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text variant="labelSmall" style={styles.dateText}>{date}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

/** Renders a "typing" indicator bubble */
export function TypingIndicator({ names }: { names: string[] }) {
  const { styles } = useThemedStyles(makeStyles);
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <View style={[styles.container, styles.otherContainer]}>
      <View style={styles.messageCol}>
        <View style={[styles.bubble, styles.otherBubble, styles.typingBubble]}>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
        <Text variant="bodySmall" style={[styles.timeOutside, styles.otherMeta, styles.typingLabel]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: space.xs,
    paddingHorizontal: space.md,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarCol: {
    marginRight: space.sm,
    alignSelf: 'flex-end',
    marginBottom: space.lg,
  },
  avatarFallback: { backgroundColor: t.surfaceVariant },
  messageCol: {
    maxWidth: '75%',
  },
  bubble: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
  },
  ownBubble: {
    backgroundColor: t.accentSolid,
    borderBottomRightRadius: radius.sm,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: t.surfaceVariant,
    borderBottomLeftRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  failedBubble: {
    backgroundColor: t.statusBadBg,
  },
  senderName: {
    color: t.textSecondary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.xxs,
    marginBottom: space.xxs,
    marginLeft: space.xs,
  },
  ownText: {
    color: t.onAccent,
  },
  otherText: {
    color: t.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xxs,
    paddingHorizontal: space.xs,
  },
  ownMeta: {
    justifyContent: 'flex-end',
  },
  otherMeta: {
    justifyContent: 'flex-start',
  },
  timeOutside: {
    fontSize: fontSize.xxs,
    color: t.textMuted,
  },
  statusText: {
    fontSize: fontSize.xxs,
    color: t.textMuted,
  },
  failedText: {
    fontSize: fontSize.xxs,
    color: t.statusBadFg,
    fontWeight: fontWeight.semibold,
  },
  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: space.lg,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.border,
  },
  dateText: {
    color: t.textMuted,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.xxs,
  },
  // Typing indicator
  typingBubble: {
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
  },
  typingLabel: {
    fontSize: fontSize.xxs,
    color: t.textMuted,
    marginTop: space.xxs,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: space.xs,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    // eslint-disable-next-line no-restricted-syntax -- intentional
    borderRadius: 3.5,
    backgroundColor: t.textMuted,
    opacity: 0.4,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.9 },
  likeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    backgroundColor: t.surface,
    borderColor: t.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: 1,
    marginTop: -space.sm,
  },
  likeBadgeOwn: { alignSelf: 'flex-end' },
  likeBadgeOther: { alignSelf: 'flex-start' },
  likeBadgeText: { fontSize: fontSize.xxs, color: t.textSecondary, fontWeight: fontWeight.semibold },
});
