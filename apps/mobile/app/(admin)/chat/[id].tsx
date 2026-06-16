import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Platform, Pressable, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { useChatMessages, ChatMessage } from '@/hooks/useChatMessages';
import { MessageBubble, DateSeparator, TypingIndicator } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { IconButton, Text } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { useChatReadStore } from '@/stores/chatReadStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

type ListItem =
  | { type: 'date'; date: string; key: string }
  | { type: 'message'; message: ChatMessage; key: string };

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Today';
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function AdminMessageThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const {
    messages,
    loading,
    loadingOlder,
    hasOlderMessages,
    sendMessage,
    retryMessage,
    loadOlderMessages,
    typingUsers,
    sendTyping,
    stopTyping,
    toggleMessageLike,
    refreshLikes,
  } = useChatMessages(id || '');
  const flatListRef = useRef<FlatList>(null);

  // Reconcile like counts from the server when the screen regains focus
  // (realtime deltas can drift if events are missed while backgrounded).
  useFocusEffect(useCallback(() => { refreshLikes(); }, [refreshLikes]));
  const insets = useSafeAreaInsets();
  const [groupName, setGroupName] = useState('Messages');
  const [userFirstName, setUserFirstName] = useState('');
  const markGroupRead = useChatReadStore((s) => s.markGroupRead);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isNearBottomRef = useRef(true);

  // Fetch group name for the header
  useEffect(() => {
    if (!id) return;
    async function fetchGroupName() {
      const { data: group } = await supabase
        .from('chat_groups')
        .select('name')
        .eq('id', id)
        .single();

      if (group?.name) {
        setGroupName(group.name);
        return;
      }

      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id, users(first_name, last_name)')
        .eq('group_id', id);

      if (participants) {
        const others = participants
          .filter((p: any) => p.user_id !== userId && p.users)
          .map((p: any) => p.users.first_name);
        if (others.length > 0) {
          setGroupName(others.join(', '));
        }
      }
    }
    fetchGroupName();
  }, [id, userId]);

  // Cache user's first name for typing indicator
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('users')
      .select('first_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) setUserFirstName((data as any).first_name || '');
      });
  }, [userId]);

  // Optimistically mark group as read
  useEffect(() => {
    if (id) markGroupRead(id);
  }, [id, markGroupRead]);

  // Persist read state to database
  useEffect(() => {
    if (!id || !userId) return;
    Promise.resolve(
      supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('group_id', id)
        .eq('user_id', userId)
    ).catch(() => {});
  }, [id, userId, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Build list items with date separators
  const listItems: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    let lastDateKey = '';

    for (const msg of messages) {
      const dateKey = getDateKey(msg.created_at);
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        items.push({
          type: 'date',
          date: formatDateLabel(msg.created_at),
          key: `date-${dateKey}`,
        });
      }
      items.push({ type: 'message', message: msg, key: msg.id });
    }
    return items;
  }, [messages]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const nearBottom = distanceFromBottom < 100;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom && contentSize.height > layoutMeasurement.height * 1.5);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleTyping = useCallback(() => {
    if (userId && userFirstName) {
      sendTyping(userId, userFirstName);
    }
  }, [userId, userFirstName, sendTyping]);

  const othersTyping = typingUsers.filter((t) => t.userId !== userId);

  if (loading && messages.length === 0) return <LoadingScreen />;

  const handleSend = async (text: string) => {
    await sendMessage(userId, text);
    if (id && userId) {
      Promise.resolve(
        supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('group_id', id)
          .eq('user_id', userId)
      ).catch(() => {});
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return <DateSeparator date={item.date} />;
    }

    const msg = item.message;
    const isOwn = msg.sender_id === userId;
    const senderName = msg.users
      ? `${msg.users.first_name} ${msg.users.last_name}`
      : 'Unknown';

    return (
      <MessageBubble
        content={msg.content}
        createdAt={msg.created_at}
        senderName={senderName}
        senderAvatar={msg.users?.avatar_url}
        isOwn={isOwn}
        status={msg.status}
        onRetry={
          msg.status === 'failed'
            ? () => retryMessage(msg.id, userId)
            : undefined
        }
        likeCount={msg.like_count}
        liked={msg.liked}
        onToggleLike={() => toggleMessageLike(msg.id)}
      />
    );
  };

  const keyboardOffset = Platform.OS === 'ios' ? insets.top + 44 : 0;

  return (
    <>
      <Stack.Screen options={{
        title: groupName,
        // Explicit back button: the native one only appears when this screen
        // has a prior entry in the chat stack, which it doesn't when opened
        // cross-tab (e.g. from an event). Falls back to the chat list.
        headerLeft: () => (
          <IconButton
            icon="chevron-left"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/chat'))}
          />
        ),
        headerRight: () => (
          <IconButton icon="dots-vertical" onPress={() => router.push({ pathname: '/(admin)/chat/edit', params: { id } })} />
        ),
      }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
      >
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState icon="chat-outline" title="No messages yet" subtitle="Send the first message!" />}
          ListHeaderComponent={
            hasOlderMessages && messages.length > 0 ? (
              <Pressable onPress={loadOlderMessages} style={styles.loadOlderBtn}>
                {loadingOlder ? (
                  <ActivityIndicator size="small" color={tokens.textMuted} />
                ) : (
                  <Text variant="bodySmall" style={styles.loadOlderText}>Load older messages</Text>
                )}
              </Pressable>
            ) : null
          }
          ListFooterComponent={
            othersTyping.length > 0 ? (
              <TypingIndicator names={othersTyping.map((t) => t.firstName)} />
            ) : null
          }
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ItemSeparatorComponent={() => null}
        />

        {showScrollToBottom && (
          <Pressable style={styles.scrollToBottomBtn} onPress={scrollToBottom}>
            <MaterialCommunityIcons name="chevron-down" size={22} color={tokens.onAccent} />
          </Pressable>
        )}

        <ChatInput onSend={handleSend} onTyping={handleTyping} />
      </KeyboardAvoidingView>
    </>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.surface },
  list: { paddingVertical: 12 },
  emptyContainer: { flex: 1 },
  loadOlderBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadOlderText: {
    color: t.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  scrollToBottomBtn: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.accentSolid,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
