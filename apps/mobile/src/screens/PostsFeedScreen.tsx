import React, { useCallback, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { usePosts } from '@/hooks/usePosts';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import { PostListSkeleton } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';
import type { AppRole } from '@/lib/roles';

/**
 * Posts feed shared by the admin and student routes. Role only determines the
 * navigation prefix.
 */
export function PostsFeedScreen({ role }: { role: AppRole }) {
  const router = useRouter();
  const { styles, tokens } = useThemedStyles(makeStyles);
  const { posts, loading, error, hasMore, refetch, fetchMore, toggleLike } = usePosts();
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);

  const viewedRef = useRef<Set<string>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 1000 }).current;
  const onViewableItemsChanged = useRef(async ({ viewableItems }: { viewableItems: { key?: string; item?: any }[] }) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    for (const v of viewableItems) {
      const postId = v.item?.id;
      if (!postId || viewedRef.current.has(postId)) continue;
      viewedRef.current.add(postId);
      supabase
        .from('post_views')
        .upsert({ post_id: postId, user_id: uid }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
        .then(() => {});
    }
  }).current;

  if (!loading && !initialLoadDone.current) {
    initialLoadDone.current = true;
  }

  // Silent refetch when screen regains focus (no spinner)
  useFocusEffect(useCallback(() => {
    if (initialLoadDone.current) {
      refetch();
    }
  }, [refetch]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (loading && posts.length === 0 && !initialLoadDone.current) return <PostListSkeleton />;
  if (error && posts.length === 0) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            id={item.id}
            content={item.content}
            createdAt={item.created_at}
            author={item.users}
            commentCount={item.comments?.[0]?.count || 0}
            likeCount={item.like_count}
            viewCount={item.view_count}
            attachments={item.attachments}
            liked={item.liked}
            onToggleLike={() => { toggleLike(item.id).catch(() => {}); }}
            onPress={() => router.push(`/(${role})/posts/${item.id}` as Parameters<typeof router.push>[0])}
          />
        )}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="message-text-outline"
            title="No posts yet"
            subtitle="Be the first to post something!"
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={hasMore ? fetchMore : undefined}
        onEndReachedThreshold={0.5}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />
      <FAB
        icon="plus"
        color={tokens.onAccent}
        style={styles.fab}
        onPress={() => router.push(`/(${role})/posts/new` as Parameters<typeof router.push>[0])}
        accessibilityLabel="Create new post"
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.surface },
    list: { padding: 16 },
    emptyContainer: { flex: 1, padding: 16 },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      backgroundColor: t.accentSolid,
      borderRadius: 16,
    },
  });
