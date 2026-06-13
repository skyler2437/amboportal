import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { usePosts } from '@/hooks/usePosts';
import { supabase } from '@/lib/supabase';
import { PostAttachmentBar } from '@/components/PostAttachmentBar';
import { type PickedAsset } from '@/lib/attachments';

export default function NewPost() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { createPost } = usePosts();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<PickedAsset[]>([]);
  const [posting, setPosting] = useState(false);
  const [me, setMe] = useState<{ first_name: string; last_name: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('users')
      .select('first_name, last_name, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => { if (data) setMe(data as typeof me); });
  }, [userId]);

  const canPost = (content.trim().length > 0 || attachments.length > 0) && !posting;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      await createPost(userId, content.trim(), attachments);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const initials = `${me?.first_name?.[0] || ''}${me?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Cancel">
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handlePost}
              disabled={!canPost}
              accessibilityLabel="Post"
              style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            >
              <Text style={styles.postBtnText}>Post</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.body}>
        {me?.avatar_url ? (
          <Avatar.Image size={36} source={{ uri: me.avatar_url }} />
        ) : (
          <Avatar.Text size={36} label={initials} style={styles.avatarFallback} />
        )}
        <TextInput
          placeholder="Share an update…"
          placeholderTextColor="#9ca3af"
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          style={styles.input}
        />
      </View>

      <PostAttachmentBar attachments={attachments} onChange={setAttachments} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  cancel: { color: '#005EFF', fontSize: 16 },
  postBtn: { backgroundColor: '#005EFF', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 6 },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  body: { flex: 1, flexDirection: 'row', gap: 10, padding: 16 },
  avatarFallback: { backgroundColor: '#e5e7eb' },
  input: { flex: 1, fontSize: 16, color: '#111827', paddingTop: 6, textAlignVertical: 'top' },
});
