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

export default function StudentPostsFeed() {
  const router = useRouter();
  const { posts, loading, error, hasMore, refetch, fetchMore, toggleLike } = usePosts();
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);

  const viewedRef = useRef<Set<string>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 1000 }).current;
  const onViewableItemsChanged = useRef(async ({ viewableItems }: { viewableItems: { key?: string; item?: any }[] }) => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
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
            liked={item.liked}
            onToggleLike={() => { toggleLike(item.id).catch(() => {}); }}
            onPress={() => router.push(`/(student)/posts/${item.id}`)}
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
        color="#fff"
        style={styles.fab}
        onPress={() => router.push('/(student)/posts/new')}
        accessibilityLabel="Create new post"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16 },
  emptyContainer: { flex: 1, padding: 16 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#111827',
    borderRadius: 16,
  },
});
