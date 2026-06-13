import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  IconButton,
  Divider,
  Avatar,
} from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useEventDetail } from '@/hooks/useEventDetail';
import { supabase } from '@/lib/supabase';
import { createChatGroup } from '@/lib/chat';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { EventDetails, RSVPStatus } from '@ambo/database';

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

// ─── RSVP Button Component ──────────────────────────────
interface RsvpButtonProps {
  label: string;
  icon: string;
  selected: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  count?: number;
  onPress: () => void;
}

function RsvpButton({ label, icon, selected, color, bgColor, borderColor, count, onPress }: RsvpButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.rsvpBtn,
        { borderColor: selected ? borderColor : '#e5e7eb', backgroundColor: selected ? bgColor : '#fff' },
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={18} color={selected ? color : '#6b7280'} />
      <Text
        variant="bodySmall"
        style={[styles.rsvpBtnText, { color: selected ? color : '#374151', fontWeight: selected ? '700' : '500' }]}
      >
        {label}{count !== undefined && count > 0 ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

// ─── RSVP Option Chip Component ─────────────────────────
interface RsvpOptionChipProps {
  label: string;
  selected: boolean;
  count: number;
  onPress: () => void;
}

function RsvpOptionChip({ label, selected, count, onPress }: RsvpOptionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionChip,
        selected && styles.optionChipSelected,
      ]}
    >
      {selected && <MaterialCommunityIcons name="check" size={14} color="#15803d" />}
      <Text
        variant="bodySmall"
        style={[styles.optionChipText, selected && styles.optionChipTextSelected]}
      >
        {label}{count > 0 ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const router = useRouter();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const { comments, rsvps, rsvpOptions, myRsvp, myRsvpOptionId, loading, updateRsvp, postComment } = useEventDetail(id, userId);

  useEffect(() => {
    async function fetchEvent() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setEvent(data as EventDetails);
      setEventLoading(false);
    }
    fetchEvent();
  }, [id]);

  if (eventLoading || !event) return <LoadingScreen />;

  const start = formatDateTime(event.start_time);
  const end = formatDateTime(event.end_time);

  const goingCount = rsvps.filter((r) => r.status === 'going').length;
  const maybeCount = rsvps.filter((r) => r.status === 'maybe').length;

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    await postComment(commentText.trim());
    setCommentText('');
    setPosting(false);
  };

  const handleCreateAttendeeChat = async () => {
    const attendeeIds = Array.from(
      new Set(rsvps.filter((r) => r.status === 'going' || r.status === 'maybe').map((r) => r.user_id)),
    );
    if (attendeeIds.length === 0) {
      Alert.alert('No attendees yet', "No one has RSVP'd going or maybe to this event.");
      return;
    }
    setCreatingChat(true);
    try {
      const groupId = await createChatGroup(userId, event.title, attendeeIds);
      router.push(`/(student)/chat/${groupId}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create chat');
    } finally {
      setCreatingChat(false);
    }
  };

  // Attendees grouped
  const goingAttendees = rsvps.filter((r) => r.status === 'going' && r.users);
  const maybeAttendees = rsvps.filter((r) => r.status === 'maybe' && r.users);
  const hasCustomOptions = rsvpOptions.length > 0;

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Actions */}
          <View style={styles.actionRow}>
            <IconButton
              icon="chat-plus-outline"
              mode="outlined"
              size={20}
              onPress={handleCreateAttendeeChat}
              loading={creatingChat}
              disabled={creatingChat}
              accessibilityLabel="Create chat with attendees"
            />
          </View>

          {/* Event Info */}
          <Text variant="headlineSmall" style={styles.title}>{event.title}</Text>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#111827" />
            <Text variant="bodyMedium">{start.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#111827" />
            <Text variant="bodyMedium">{start.time} - {end.time}</Text>
          </View>
          {event.uniform && (
            <Card elevation={0} style={styles.uniformCard}>
              <Card.Content style={styles.uniformContent}>
                <MaterialCommunityIcons name="tshirt-crew-outline" size={18} color="#111827" />
                <Text variant="bodyMedium" style={styles.uniformText}>Uniform: {event.uniform}</Text>
              </Card.Content>
            </Card>
          )}

          {event.description && (
            <>
              <Divider style={styles.divider} />
              <Text variant="bodyMedium" style={styles.description}>{event.description}</Text>
            </>
          )}

          {/* RSVP */}
          <Divider style={styles.divider} />
          <Text variant="titleMedium" style={styles.sectionTitle}>RSVP</Text>

          {hasCustomOptions ? (
            // Two-tier layout: custom options + Maybe/Can't Go
            <View style={styles.rsvpSection}>
              <Text variant="bodySmall" style={styles.rsvpGroupLabel}>I'm going to:</Text>
              <View style={styles.optionChipRow}>
                {rsvpOptions.map((opt) => {
                  const isSelected = myRsvp === 'going' && myRsvpOptionId === opt.id;
                  const count = rsvps.filter(r => r.rsvp_option_id === opt.id).length;
                  return (
                    <RsvpOptionChip
                      key={opt.id}
                      label={opt.label}
                      selected={isSelected}
                      count={count}
                      onPress={() => updateRsvp('going' as RSVPStatus, opt.id)}
                    />
                  );
                })}
              </View>
              <View style={styles.rsvpBtnRow}>
                <RsvpButton
                  label="Maybe"
                  icon="help-circle-outline"
                  selected={myRsvp === 'maybe'}
                  color="#92400e"
                  bgColor="#fffbeb"
                  borderColor="#fde68a"
                  count={maybeCount}
                  onPress={() => updateRsvp('maybe' as RSVPStatus)}
                />
                <RsvpButton
                  label="Can't Go"
                  icon="close-circle-outline"
                  selected={myRsvp === 'no'}
                  color="#6b7280"
                  bgColor="#f9fafb"
                  borderColor="#d1d5db"
                  onPress={() => updateRsvp('no' as RSVPStatus)}
                />
              </View>
            </View>
          ) : (
            // Standard 3-button layout
            <View style={styles.rsvpBtnRow}>
              <RsvpButton
                label="Going"
                icon="check-circle-outline"
                selected={myRsvp === 'going'}
                color="#15803d"
                bgColor="#f0fdf4"
                borderColor="#86efac"
                count={goingCount}
                onPress={() => updateRsvp('going' as RSVPStatus)}
              />
              <RsvpButton
                label="Maybe"
                icon="help-circle-outline"
                selected={myRsvp === 'maybe'}
                color="#92400e"
                bgColor="#fffbeb"
                borderColor="#fde68a"
                count={maybeCount}
                onPress={() => updateRsvp('maybe' as RSVPStatus)}
              />
              <RsvpButton
                label="Can't Go"
                icon="close-circle-outline"
                selected={myRsvp === 'no'}
                color="#6b7280"
                bgColor="#f9fafb"
                borderColor="#d1d5db"
                onPress={() => updateRsvp('no' as RSVPStatus)}
              />
            </View>
          )}

          {/* Attendees */}
          {hasCustomOptions ? (
            <View style={styles.attendeesSection}>
              {rsvpOptions.map((opt) => {
                const optRsvps = rsvps.filter(r => r.rsvp_option_id === opt.id && r.users);
                if (optRsvps.length === 0) return null;
                return (
                  <View key={opt.id} style={styles.attendeeGroup}>
                    <Text variant="bodySmall" style={styles.attendeesLabel}>{opt.label}:</Text>
                    <Text variant="bodySmall" style={styles.attendeesText}>
                      {optRsvps.map(r => `${r.users.first_name} ${r.users.last_name}`).join(', ')}
                    </Text>
                  </View>
                );
              })}
              {maybeAttendees.length > 0 && (
                <View style={styles.attendeeGroup}>
                  <Text variant="bodySmall" style={styles.attendeesLabel}>Maybe:</Text>
                  <Text variant="bodySmall" style={styles.attendeesText}>
                    {maybeAttendees.map(r => `${r.users.first_name} ${r.users.last_name}`).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.attendeesSection}>
              {goingAttendees.length > 0 && (
                <View style={styles.attendeeGroup}>
                  <Text variant="bodySmall" style={styles.attendeesLabel}>Going:</Text>
                  <Text variant="bodySmall" style={styles.attendeesText}>
                    {goingAttendees.map((r) => `${r.users.first_name} ${r.users.last_name}`).join(', ')}
                  </Text>
                </View>
              )}
              {maybeAttendees.length > 0 && (
                <View style={styles.attendeeGroup}>
                  <Text variant="bodySmall" style={styles.attendeesLabel}>Maybe:</Text>
                  <Text variant="bodySmall" style={styles.attendeesText}>
                    {maybeAttendees.map((r) => `${r.users.first_name} ${r.users.last_name}`).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Comments */}
          <Divider style={styles.divider} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Comments ({comments.length})
          </Text>

          {comments.filter((c) => c.users).map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <Avatar.Text
                size={32}
                label={`${comment.users.first_name?.[0] || ''}${comment.users.last_name?.[0] || ''}`}
                style={styles.commentAvatar}
              />
              <View style={styles.commentBody}>
                <Text variant="bodySmall" style={styles.commentAuthor}>
                  {comment.users.first_name} {comment.users.last_name}
                </Text>
                <Text variant="bodyMedium">{comment.content}</Text>
                <Text variant="labelSmall" style={styles.commentTime}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}

          {/* Comment Input */}
          <View style={styles.commentInput}>
            <TextInput
              mode="outlined"
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              style={styles.commentTextInput}
              dense
            />
            <IconButton
              icon="send"
              mode="contained"
              onPress={handlePostComment}
              disabled={!commentText.trim() || posting}
              loading={posting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  title: { fontWeight: '700', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  uniformCard: { backgroundColor: '#eff6ff', marginTop: 12 },
  uniformContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uniformText: { color: '#1d4ed8' },
  divider: { marginVertical: 16 },
  description: { color: '#374151', lineHeight: 22 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },

  // RSVP section
  rsvpSection: { gap: 12, marginBottom: 12 },
  rsvpGroupLabel: { color: '#6b7280', fontWeight: '500' },
  rsvpBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  rsvpBtnText: { fontSize: 13 },

  // Custom option chips
  optionChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  optionChipSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  optionChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  optionChipTextSelected: { color: '#15803d', fontWeight: '700' },

  // Attendees
  attendeesSection: { gap: 6, marginBottom: 4 },
  attendeeGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  attendeesLabel: { fontWeight: '600', color: '#374151' },
  attendeesText: { color: '#6b7280', flex: 1 },

  // Comments
  comment: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  commentAvatar: { backgroundColor: '#e5e7eb' },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: '600', marginBottom: 2 },
  commentTime: { color: '#9ca3af', marginTop: 4 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  commentTextInput: { flex: 1, backgroundColor: '#fff' },
});
