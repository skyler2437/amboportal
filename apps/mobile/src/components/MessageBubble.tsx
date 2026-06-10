import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Avatar, Icon, Text } from 'react-native-paper';
import type { MessageStatus } from '@/hooks/useChatMessages';

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
            <Avatar.Text size={28} label={initials} style={styles.avatarFallback} labelStyle={{ fontSize: 11 }} />
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
                color={liked ? '#ef4444' : '#9ca3af'}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarCol: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  avatarFallback: { backgroundColor: '#e5e7eb' },
  messageCol: {
    maxWidth: '75%',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#005EFF',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  failedBubble: {
    backgroundColor: '#451a1a',
  },
  senderName: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 4,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#1f2937',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  ownMeta: {
    justifyContent: 'flex-end',
  },
  otherMeta: {
    justifyContent: 'flex-start',
  },
  timeOutside: {
    fontSize: 10,
    color: '#9ca3af',
  },
  statusText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  failedText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dateText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 11,
  },
  // Typing indicator
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  typingLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#9ca3af',
    opacity: 0.4,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.9 },
  likeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: -6,
  },
  likeBadgeOwn: { alignSelf: 'flex-end' },
  likeBadgeOther: { alignSelf: 'flex-start' },
  likeBadgeText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
});
