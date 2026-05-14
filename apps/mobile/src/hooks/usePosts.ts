import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { handleAuthError } from '@/lib/authError';
import type { UserRole } from '@ambo/database';

const PAGE_SIZE = 20;

export interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  users: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    role: UserRole;
  };
  comments: { count: number }[];
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('posts')
      .select('*, users(first_name, last_name, avatar_url, role), comments(count)')
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (err) {
      // Auth-shaped error: sign out so the user lands on login instead of the
      // inline "Try Again" state that can't recover from a stale JWT.
      if (!handleAuthError(err)) {
        setError(err.message);
      }
    } else {
      const filtered = ((data || []) as Post[]).filter((p) => p.users != null);
      setPosts(filtered);
      setHasMore((data || []).length === PAGE_SIZE);
    }
    setLoading(false);
  }, []);

  const fetchMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;

    const { data, error: err } = await supabase
      .from('posts')
      .select('*, users(first_name, last_name, avatar_url, role), comments(count)')
      .order('created_at', { ascending: false })
      .range(posts.length, posts.length + PAGE_SIZE - 1);

    if (!err && data) {
      const filtered = (data as Post[]).filter((p) => p.users != null);
      setPosts((prev) => [...prev, ...filtered]);
      setHasMore(data.length === PAGE_SIZE);
    }
    loadingMoreRef.current = false;
  }, [posts.length, hasMore]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = async (userId: string, content: string) => {
    const { error: err } = await supabase
      .from('posts')
      .insert({ user_id: userId, content });
    if (err) throw err;
    await fetchPosts();
  };

  const editPost = async (postId: string, content: string) => {
    const { error: err } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', postId);
    if (err) throw err;
    await fetchPosts();
  };

  const deletePost = async (postId: string) => {
    const { error: err } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    if (err) throw err;
    await fetchPosts();
  };

  return { posts, loading, error, hasMore, refetch: fetchPosts, fetchMore, createPost, editPost, deletePost };
}
