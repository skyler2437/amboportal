import React from 'react';
import { View, StyleSheet, Pressable, Share } from 'react-native';
import { Avatar, Text, IconButton, Icon } from 'react-native-paper';
import type { UserRole } from '@ambo/database';
import { PostAttachments } from '@/components/PostAttachments';
import type { Attachment } from '@/hooks/usePosts';

interface PostCardProps {
  id: string;
  content: string;
  createdAt: string;
  author: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    role: UserRole;
  };
  commentCount: number;
  likeCount: number;
  viewCount: number;
  attachments?: Attachment[];
  liked: boolean;
  onToggleLike: () => void;
  onPress: () => void;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function PostCard({ content, createdAt, author, commentCount, likeCount, viewCount, liked, attachments, onToggleLike, onPress }: PostCardProps) {
  const initials = `${author.first_name?.[0] || ''}${author.last_name?.[0] || ''}`;

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityLabel={`Post by ${author.first_name} ${author.last_name}, ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`} accessibilityRole="button">
      <View style={styles.header}>
        {author.avatar_url ? (
          <Avatar.Image size={36} source={{ uri: author.avatar_url }} />
        ) : (
          <Avatar.Text size={36} label={initials} style={styles.avatarFallback} />
        )}
        <View style={styles.authorInfo}>
          <Text variant="bodyMedium" style={styles.authorName}>
            {author.first_name} {author.last_name}
          </Text>
          <Text variant="bodySmall" style={styles.timestamp}>
            {formatTimeAgo(createdAt)}
          </Text>
        </View>
      </View>
      <Text variant="bodyMedium" style={styles.content} numberOfLines={3}>
        {content}
      </Text>
      {attachments && attachments.length > 0 && (
        <PostAttachments attachments={attachments} variant="compact" />
      )}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.likeGroup}>
            <IconButton
              icon={liked ? 'heart' : 'heart-outline'}
              size={18}
              iconColor={liked ? '#ef4444' : '#9ca3af'}
              accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
              style={styles.iconBtn}
              onPress={(e) => { e.stopPropagation?.(); onToggleLike(); }}
            />
            {likeCount > 0 && <Text variant="bodySmall" style={styles.likeCountText}>{likeCount}</Text>}
          </View>
          <Text variant="bodySmall" style={styles.commentCount}>
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
        <View style={styles.footerRight}>
          <Icon source="eye-outline" size={14} color="#6b7280" />
          <Text variant="bodySmall" style={styles.metaText}>{viewCount}</Text>
          <IconButton
            icon="share-variant-outline"
            size={18}
            iconColor="#9ca3af"
            accessibilityLabel="Share post"
            style={styles.iconBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Share.share({
                message: `${author.first_name} ${author.last_name}: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`,
              });
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarFallback: { backgroundColor: '#e5e7eb' },
  authorInfo: { gap: 2, flex: 1 },
  authorName: { fontWeight: '600' },
  timestamp: { color: '#9ca3af', fontSize: 12 },
  content: { marginTop: 10, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // The IconButton renders the 18px heart in a 34px touch target (8px of
  // internal padding per side); the negative margin pulls the count back
  // against the glyph so it reads as one unit, separate from the comments.
  likeGroup: { flexDirection: 'row', alignItems: 'center' },
  likeCountText: { color: '#6b7280', marginLeft: -6 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { margin: 0 },
  metaText: { color: '#6b7280' },
  commentCount: { color: '#6b7280', fontWeight: '500' },
});
