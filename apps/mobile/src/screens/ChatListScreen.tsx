import React, { useCallback, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, Alert } from 'react-native';
import { Avatar, Text, FAB } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Star } from 'lucide-react-native';
import { useChatGroups, ChatGroupWithMeta } from '@/hooks/useChatGroups';
import { useChatReadStore } from '@/stores/chatReadStore';
import { SwipeableChatRow } from '@/components/SwipeableChatRow';
import { ChatListSkeleton } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getInitials, formatChatListDate } from '@/lib/format';
import { space, radius, fontWeight, type SemanticTokens } from '@/lib/theme';
import type { AppRole } from '@/lib/roles';

function getGroupDisplayName(group: ChatGroupWithMeta, currentUserId: string): string {
  if (group.name) return group.name;
  const others = group.participants
    .filter((p) => p.user_id !== currentUserId && p.users)
    .map((p) => p.users.first_name);
  return others.length > 0 ? others.join(', ') : 'Chat';
}

/** Chat list shared by the admin and student routes. */
export function ChatListScreen({ role }: { role: AppRole }) {
  const router = useRouter();
  const { styles, tokens } = useThemedStyles(makeStyles);
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { groups, loading, error, refetch, toggleStar, deleteChat } = useChatGroups(userId);
  const clearReadGroups = useChatReadStore((s) => s.clearReadGroups);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);

  const confirmDelete = (groupId: string, name: string) => {
    Alert.alert(
      'Delete chat',
      `Remove "${name}" from your chats? It will come back if there's a new message.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteChat(groupId) },
      ],
    );
  };

  // Track when initial load completes
  if (!loading && !initialLoadDone.current) {
    initialLoadDone.current = true;
  }

  // Refetch on focus — don't clear optimistic readGroups here.
  // The badge count hook reconciles server vs optimistic state;
  // clearing too early causes a flash where the badge reappears.
  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) {
        refetch();
      }
    }, [refetch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Only show full loading screen on initial load
  if (loading && groups.length === 0 && !initialLoadDone.current) return <ChatListSkeleton />;
  if (error && groups.length === 0) return <ErrorState message={error} onRetry={refetch} />;

  const renderGroup = ({ item }: { item: ChatGroupWithMeta }) => {
    const displayName = getGroupDisplayName(item, userId);
    const otherParticipant = item.participants.find((p) => p.user_id !== userId && p.users);
    const initials = otherParticipant
      ? getInitials(otherParticipant.users.first_name, otherParticipant.users.last_name)
      : '?';
    const avatarUrl = otherParticipant?.users?.avatar_url;
    const hasUnread = item.hasUnread === true;

    return (
      <SwipeableChatRow
        starred={!!item.starred}
        onToggleStar={() => toggleStar(item.id, !item.starred)}
        onDelete={() => confirmDelete(item.id, displayName)}
      >
        <Pressable style={styles.groupRow} onPress={() => router.push(`/(${role})/chat/${item.id}` as Parameters<typeof router.push>[0])} accessibilityLabel={`Chat with ${displayName}${item.starred ? ', starred' : ''}${hasUnread ? ', unread messages' : ''}`} accessibilityRole="button">
          {avatarUrl ? (
            <Avatar.Image size={44} source={{ uri: avatarUrl }} />
          ) : (
            <Avatar.Text size={44} label={initials} style={styles.avatarFallback} />
          )}
          <View style={styles.groupInfo}>
            <View style={styles.groupNameRow}>
              {item.starred && <Star size={13} color={tokens.statusWarnFg} fill={tokens.statusWarnFg} />}
              <Text variant="bodyLarge" style={[styles.groupName, hasUnread && styles.groupNameUnread]} numberOfLines={1}>
                {displayName}
              </Text>
              {hasUnread && <View style={styles.unreadDot} />}
            </View>
            {item.lastMessage && (
              <Text variant="bodySmall" style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
                {item.lastMessage.content}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text variant="bodySmall" style={styles.time}>{formatChatListDate(item.lastMessage.created_at)}</Text>
          )}
        </Pressable>
      </SwipeableChatRow>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<EmptyState icon="chat-outline" title="No conversations" subtitle="Start a new chat to get started" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <FAB icon="plus" color={tokens.onAccent} style={styles.fab} onPress={() => router.push(`/(${role})/chat/new` as Parameters<typeof router.push>[0])} accessibilityLabel="Start new chat" />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.surface },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.lg,
    gap: space.md,
  },
  avatarFallback: { backgroundColor: t.surfaceVariant },
  groupInfo: { flex: 1 },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  groupName: { fontWeight: fontWeight.semibold, flex: 1 },
  // eslint-disable-next-line no-restricted-syntax -- intentional: extra-bold unread emphasis has no token step
  groupNameUnread: { fontWeight: '800' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: t.accentSolid,
  },
  lastMessage: { color: t.textSecondary, marginTop: space.xxs },
  lastMessageUnread: { color: t.textPrimary, fontWeight: fontWeight.semibold },
  time: { color: t.textMuted },
  // eslint-disable-next-line no-restricted-syntax -- intentional: aligns separator with avatar+gutter width, not a spacing step
  separator: { height: 1, backgroundColor: t.divider, marginLeft: 72 },
  emptyContainer: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: t.accentSolid,
  },
});
