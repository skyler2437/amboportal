import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Divider,
  Avatar,
  Icon,
} from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { usePosts } from '@/hooks/usePosts';
import { useComments, Comment } from '@/hooks/useComments';
import { RoleBadge } from '@/components/RoleBadge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PostAttachments } from '@/components/PostAttachments';
import { UserListDialog, DialogUser } from '@/components/UserListDialog';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@ambo/database';

function canModify(
  targetUserId: string,
  targetRole: UserRole,
  currentUserId: string,
  currentUserRole: UserRole
): boolean {
  if (currentUserId === targetUserId) return true;
  if (currentUserRole === 'superadmin') return true;
  if (currentUserRole === 'admin' && (targetRole === 'student' || targetRole === 'basic'))
    return true;
  return false;
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

export default function StudentPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, userRole } = useAuth();
  const userId = session?.user?.id || '';
  const currentRole = userRole || 'student';
  const insets = useSafeAreaInsets();

  const { posts, loading: postsLoading, editPost, deletePost, toggleLike } = usePosts();
  const {
    comments,
    loading: commentsLoading,
    createComment,
    editComment,
    deleteComment,
  } = useComments(id);

  const post = posts.find((p) => p.id === id);

  // Post edit state
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  // Comment input state
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const commentInputRef = useRef<RNTextInput>(null);

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [likesOpen, setLikesOpen] = useState(false);
  const [likers, setLikers] = useState<DialogUser[] | null>(null);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewers, setViewers] = useState<DialogUser[] | null>(null);

  const openLikers = async () => {
    setLikesOpen(true);
    setLikers(null);
    const { data } = await supabase
      .from('post_likes')
      .select('users(id, first_name, last_name, avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: false });
    setLikers(((data as any[]) || []).map((r) => r.users).filter(Boolean));
  };

  const openViewers = async () => {
    setViewsOpen(true);
    setViewers(null);
    const { data } = await supabase
      .from('post_views')
      .select('users(id, first_name, last_name, avatar_url)')
      .eq('post_id', id)
      .order('viewed_at', { ascending: false });
    setViewers(((data as any[]) || []).map((r) => r.users).filter(Boolean));
  };

  if (postsLoading && !post) return <LoadingScreen />;

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title: 'Post' }} />
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.notFoundText}>
            Post not found
          </Text>
          <Button mode="outlined" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </>
    );
  }

  const showActions = canModify(post.user_id, post.users.role, userId, currentRole);
  const initials = `${post.users.first_name?.[0] || ''}${post.users.last_name?.[0] || ''}`;

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await editPost(post.id, editText.trim());
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to edit post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await createComment(userId, commentText.trim());
      setCommentText('');
      commentInputRef.current?.focus();
    } catch {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    setSaving(true);
    try {
      await editComment(commentId, editCommentText.trim());
      setEditingCommentId(null);
    } catch {
      Alert.alert('Error', 'Failed to edit comment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
          } catch {
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  const keyboardOffset = Platform.OS === 'ios' ? insets.top + 44 : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Post' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Author header */}
          <View style={styles.header}>
            {post.users.avatar_url ? (
              <Avatar.Image size={44} source={{ uri: post.users.avatar_url }} />
            ) : (
              <Avatar.Text size={44} label={initials} style={styles.avatarFallback} />
            )}
            <View style={styles.authorInfo}>
              <Text variant="titleMedium" style={styles.authorName}>
                {post.users.first_name} {post.users.last_name}
              </Text>
              <View style={styles.metaRow}>
                <RoleBadge role={post.users.role} />
                <Text variant="bodySmall" style={styles.timestamp}>
                  {formatTimeAgo(post.created_at)}
                </Text>
              </View>
            </View>
          </View>

          {/* Admin actions */}
          {showActions && (
            <View style={styles.adminActions}>
              <Button
                mode="outlined"
                icon="pencil"
                onPress={() => {
                  setEditing(!editing);
                  setEditText(post.content);
                }}
                compact
              >
                {editing ? 'Cancel Edit' : 'Edit'}
              </Button>
              <Button
                mode="outlined"
                icon="delete"
                textColor="#ef4444"
                onPress={handleDelete}
                compact
              >
                Delete
              </Button>
            </View>
          )}

          {/* Post content or edit form */}
          {editing ? (
            <View style={styles.editSection}>
              <TextInput
                mode="outlined"
                value={editText}
                onChangeText={setEditText}
                multiline
                dense
                style={styles.editInput}
              />
              <View style={styles.editActions}>
                <Button mode="text" onPress={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveEdit}
                  loading={saving}
                  disabled={!editText.trim()}
                >
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.content}>
                {post.content}
              </Text>
              <PostAttachments attachments={post.attachments} variant="full" />
            </>
          )}

          <View style={styles.engagementRow}>
            <IconButton
              icon={post.liked ? 'heart' : 'heart-outline'}
              size={20}
              iconColor={post.liked ? '#ef4444' : '#6b7280'}
              onPress={() => toggleLike(post.id).catch(() => {})}
              accessibilityLabel={post.liked ? 'Unlike post' : 'Like post'}
              style={{ margin: 0 }}
            />
            <Text variant="bodySmall" onPress={openLikers} style={[styles.engagementText, styles.likeCountTight]}>
              {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
            </Text>
            <Pressable onPress={openViewers} style={styles.engagementViews}>
              <Icon source="eye-outline" size={16} color="#6b7280" />
              <Text variant="bodySmall" style={styles.engagementText}>{post.view_count} seen</Text>
            </Pressable>
          </View>

          {/* Comments section */}
          <Divider style={styles.divider} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Comments ({comments.length})
          </Text>

          {commentsLoading ? (
            <Text variant="bodySmall" style={styles.loadingText}>
              Loading comments...
            </Text>
          ) : comments.length === 0 ? (
            <Text variant="bodySmall" style={styles.noComments}>
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            comments.map((comment) => {
              const commentInitials = `${comment.users.first_name?.[0] || ''}${comment.users.last_name?.[0] || ''}`;
              const canActOnComment = canModify(
                comment.user_id,
                comment.users.role,
                userId,
                currentRole
              );
              const isEditingThis = editingCommentId === comment.id;

              return (
                <View key={comment.id} style={styles.commentRow}>
                  {comment.users.avatar_url ? (
                    <Avatar.Image
                      size={32}
                      source={{ uri: comment.users.avatar_url }}
                    />
                  ) : (
                    <Avatar.Text
                      size={32}
                      label={commentInitials}
                      style={styles.commentAvatar}
                      labelStyle={{ fontSize: 12 }}
                    />
                  )}
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text variant="labelMedium" style={styles.commentAuthor}>
                        {comment.users.first_name} {comment.users.last_name}
                      </Text>
                      <Text variant="bodySmall" style={styles.timestamp}>
                        {formatTimeAgo(comment.created_at)}
                      </Text>
                    </View>
                    {isEditingThis ? (
                      <View style={styles.editSection}>
                        <TextInput
                          mode="outlined"
                          value={editCommentText}
                          onChangeText={setEditCommentText}
                          dense
                          multiline
                        />
                        <View style={styles.editActions}>
                          <Button
                            mode="text"
                            onPress={() => setEditingCommentId(null)}
                            compact
                          >
                            Cancel
                          </Button>
                          <Button
                            mode="contained"
                            onPress={() => handleSaveCommentEdit(comment.id)}
                            loading={saving}
                            compact
                            disabled={!editCommentText.trim()}
                          >
                            Save
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <Text variant="bodyMedium" style={{ fontSize: 14 }}>{comment.content}</Text>
                    )}
                  </View>
                  {canActOnComment && !isEditingThis && (
                    <View style={styles.commentActions}>
                      <IconButton
                        icon="pencil-outline"
                        size={14}
                        onPress={() => {
                          setEditingCommentId(comment.id);
                          setEditCommentText(comment.content);
                        }}
                      />
                      <IconButton
                        icon="delete-outline"
                        size={14}
                        iconColor="#ef4444"
                        onPress={() => handleDeleteComment(comment.id)}
                      />
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Sticky comment input */}
        <View
          style={[styles.commentInput, { paddingBottom: Math.max(8, insets.bottom) }]}
        >
          <TextInput
            ref={commentInputRef as any}
            mode="outlined"
            placeholder="Add a comment..."
            value={commentText}
            onChangeText={setCommentText}
            style={styles.commentTextInput}
            dense
            multiline
            blurOnSubmit={false}
          />
          <IconButton
            icon="send"
            mode="contained"
            onPress={handlePostComment}
            disabled={!commentText.trim() || posting}
            loading={posting}
          />
        </View>
      </KeyboardAvoidingView>
      <UserListDialog visible={likesOpen} title={`Liked by ${post.like_count}`} users={likers} onDismiss={() => setLikesOpen(false)} />
      <UserListDialog visible={viewsOpen} title={`Seen by ${post.view_count}`} users={viewers} onDismiss={() => setViewsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  notFoundText: { color: '#6b7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarFallback: { backgroundColor: '#e5e7eb' },
  authorInfo: { gap: 2, flex: 1 },
  authorName: { fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timestamp: { color: '#9ca3af', fontSize: 12 },
  adminActions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  content: { lineHeight: 24, color: '#111827' },
  editSection: { gap: 8 },
  editInput: { backgroundColor: '#fff' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  divider: { marginVertical: 20 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  loadingText: { color: '#9ca3af', paddingVertical: 8 },
  noComments: { color: '#9ca3af', paddingVertical: 8 },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  commentAvatar: { backgroundColor: '#e5e7eb' },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  commentAuthor: { fontWeight: '600' },
  commentActions: { flexDirection: 'row' },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  commentTextInput: { flex: 1, backgroundColor: '#fff', maxHeight: 100 },
  engagementRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  engagementText: { color: '#6b7280' },
  // Cancels part of the IconButton's internal padding so the count hugs the heart
  likeCountTight: { marginLeft: -4 },
  engagementViews: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 16 },
});
