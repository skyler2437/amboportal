import React, { useState, useEffect, useRef } from 'react';
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
  Card,
  Button,
  TextInput,
  IconButton,
  Divider,
  Avatar,
} from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useEventDetail } from '@/hooks/useEventDetail';
import { supabase } from '@/lib/supabase';
import { createChatGroup } from '@/lib/chat';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EventDateTimePicker } from '@/components/EventDateTimePicker';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getInitials } from '@/lib/format';
import type { SemanticTokens } from '@/lib/theme';
import type { AppRole } from '@/lib/roles';
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
  // Color of the label/icon when the button is NOT selected. The admin and
  // student screens historically differed here (textPrimary vs textSecondary),
  // so it's parameterized to preserve each role's exact appearance.
  unselectedColor: string;
}

function RsvpButton({ label, icon, selected, color, bgColor, borderColor, count, onPress, unselectedColor }: RsvpButtonProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.rsvpBtn,
        { borderColor: selected ? borderColor : tokens.border, backgroundColor: selected ? bgColor : tokens.surface },
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={18} color={selected ? color : tokens.textSecondary} />
      <Text
        variant="bodySmall"
        style={[styles.rsvpBtnText, { color: selected ? color : unselectedColor, fontWeight: selected ? '700' : '500' }]}
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
  // Label color when the chip is NOT selected. Drifted between the two screens
  // (admin: textPrimary, student: textSecondary); parameterized to preserve it.
  unselectedColor: string;
}

function RsvpOptionChip({ label, selected, count, onPress, unselectedColor }: RsvpOptionChipProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionChip,
        selected && styles.optionChipSelected,
      ]}
    >
      {selected && <MaterialCommunityIcons name="check" size={14} color={tokens.statusGoodFg} />}
      <Text
        variant="bodySmall"
        style={[styles.optionChipText, { color: unselectedColor }, selected && styles.optionChipTextSelected]}
      >
        {label}{count > 0 ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

/** Event detail screen shared by the admin and student routes. */
export function EventDetailScreen({ role }: { role: AppRole }) {
  const isAdmin = role === 'admin';
  const { styles, tokens } = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const router = useRouter();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const commentInputRef = useRef<RNTextInput>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  // Edit form state (admin only)
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUniform, setEditUniform] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editAllDay, setEditAllDay] = useState(false);

  const insets = useSafeAreaInsets();
  const { comments, rsvps, rsvpOptions, myRsvp, myRsvpOptionId, loading, updateRsvp, postComment } = useEventDetail(id, userId);

  useEffect(() => {
    async function fetchEvent() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        const e = data as EventDetails;
        setEvent(e);
        setEditTitle(e.title);
        setEditDescription(e.description || '');
        setEditUniform(e.uniform || '');
        setEditStartDate(new Date(e.start_time));
        setEditEndDate(new Date(e.end_time));
      }
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
    if (isAdmin) commentInputRef.current?.focus();
  };

  const getApiHeaders = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentSession?.access_token}`,
    };
  };

  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || process.env.EXPO_PUBLIC_API_BASE_URL || '';

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(`${baseUrl}/api/events/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          uniform: editUniform.trim() || null,
          start_time: editStartDate.toISOString(),
          end_time: editEndDate.toISOString(),
        }),
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to update event');
      }

      // Check GCal sync status from the response
      if (responseData.gcal_sync && !responseData.gcal_sync.synced) {
        Alert.alert('Event Saved', `Google Calendar sync failed: ${responseData.gcal_sync.reason}`);
      }

      setEvent({
        ...event,
        title: editTitle.trim(),
        description: editDescription.trim(),
        uniform: editUniform.trim() || undefined,
        start_time: editStartDate.toISOString(),
        end_time: editEndDate.toISOString(),
      });
      setEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', `Are you sure you want to delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getApiHeaders();
            const res = await fetch(`${baseUrl}/api/events/${id}`, {
              method: 'DELETE',
              headers,
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || 'Failed to delete event');
            }
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete event');
          }
        },
      },
    ]);
  };

  const handleCreateAttendeeChat = async () => {
    const rsvpIds = rsvps
      .filter((r) => r.status === 'going' || r.status === 'maybe')
      .map((r) => r.user_id);
    if (rsvpIds.length === 0) {
      Alert.alert('No attendees yet', "No one has RSVP'd going or maybe to this event.");
      return;
    }
    // Include the event organizer so the chat always has an admin present —
    // mobile doesn't otherwise enforce the "student-created groups need an
    // admin" rule, and the organizer belongs in their own event's chat.
    const participantIds = Array.from(
      new Set([...rsvpIds, ...(event.created_by ? [event.created_by] : [])]),
    );
    setCreatingChat(true);
    try {
      const groupId = await createChatGroup(userId, event.title, participantIds);
      router.push(`/(${role})/chat/${groupId}` as Parameters<typeof router.push>[0]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create chat');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch(`${baseUrl}/api/events/${id}/send-reminder`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminders');
      Alert.alert('Reminders Sent', `Sent to ${data.sent} attendee${data.sent !== 1 ? 's' : ''}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reminders');
    } finally {
      setSendingReminder(false);
    }
  };

  // Attendees grouped
  const goingAttendees = rsvps.filter((r) => r.status === 'going' && r.users);
  const maybeAttendees = rsvps.filter((r) => r.status === 'maybe' && r.users);
  const hasCustomOptions = rsvpOptions.length > 0;

  // RsvpButton unselected label color drifted between the two screens; keep each
  // role's original (admin: textPrimary, student: textSecondary).
  const rsvpUnselectedColor = isAdmin ? tokens.textPrimary : tokens.textSecondary;
  // Uniform icon color likewise drifted (admin: textPrimary, student: accent).
  const uniformIconColor = isAdmin ? tokens.textPrimary : tokens.accent;

  const keyboardOffset = Platform.OS === 'ios' ? insets.top + 44 : 0;

  // The comment input. For admin it's a sticky footer rendered outside the
  // ScrollView (docks to the keyboard); for student it's inline at the end of
  // the ScrollView. Each role keeps its original layout/behavior.
  const commentInput = (
    <View
      style={[
        isAdmin ? styles.commentInputDocked : styles.commentInputInline,
        isAdmin && { paddingBottom: Math.max(8, insets.bottom) },
      ]}
    >
      <TextInput
        ref={isAdmin ? (commentInputRef as any) : undefined}
        mode="outlined"
        placeholder="Add a comment..."
        value={commentText}
        onChangeText={setCommentText}
        style={isAdmin ? styles.commentTextInputDocked : styles.commentTextInput}
        dense
        multiline={isAdmin}
        blurOnSubmit={isAdmin ? false : undefined}
      />
      <IconButton
        icon="send"
        mode="contained"
        onPress={handlePostComment}
        disabled={!commentText.trim() || posting}
        loading={posting}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <KeyboardAvoidingView
        style={isAdmin ? styles.containerAdmin : styles.containerStudent}
        behavior={Platform.OS === 'ios' ? 'padding' : isAdmin ? 'height' : undefined}
        keyboardVerticalOffset={isAdmin ? keyboardOffset : 100}
      >
        <ScrollView
          contentContainerStyle={isAdmin ? styles.contentAdmin : styles.contentStudent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={isAdmin ? 'interactive' : undefined}
        >
          {/* Actions */}
          {isAdmin ? (
            <View style={styles.adminActions}>
              <IconButton
                icon={editing ? 'close' : 'pencil'}
                mode="outlined"
                size={20}
                onPress={() => setEditing(!editing)}
                accessibilityLabel={editing ? 'Cancel editing' : 'Edit event'}
              />
              <IconButton
                icon="delete"
                mode="outlined"
                size={20}
                iconColor={tokens.statusBadFg}
                onPress={handleDelete}
                accessibilityLabel="Delete event"
              />
              <View style={styles.actionSpacer} />
              <IconButton
                icon="chat-plus-outline"
                mode="outlined"
                size={20}
                onPress={handleCreateAttendeeChat}
                loading={creatingChat}
                disabled={creatingChat}
                accessibilityLabel="Create chat with attendees"
              />
              <IconButton
                icon="bell-ring-outline"
                mode="outlined"
                size={20}
                onPress={handleSendReminder}
                loading={sendingReminder}
                disabled={sendingReminder}
              />
            </View>
          ) : (
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
          )}

          {/* Event Info or Edit Form (edit form is admin only) */}
          {isAdmin && editing ? (
            <View style={styles.editSection}>
              <TextInput
                mode="outlined"
                label="Title"
                value={editTitle}
                onChangeText={setEditTitle}
                dense
                style={styles.editInput}
              />
              <TextInput
                mode="outlined"
                label="Description"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                dense
                style={styles.editInput}
              />
              <TextInput
                mode="outlined"
                label="Uniform"
                value={editUniform}
                onChangeText={setEditUniform}
                dense
                style={styles.editInput}
                placeholder="e.g. Ambassador Polo with Navy Pants"
              />
              <EventDateTimePicker
                startDate={editStartDate}
                endDate={editEndDate}
                allDay={editAllDay}
                onStartDateChange={setEditStartDate}
                onEndDateChange={setEditEndDate}
                onAllDayChange={setEditAllDay}
              />
              <Button
                mode="contained"
                onPress={handleSaveEdit}
                loading={saving}
                disabled={!editTitle.trim() || saving}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
            </View>
          ) : (
            <>
              <Text variant="headlineSmall" style={styles.title}>{event.title}</Text>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={18} color={tokens.textPrimary} />
                <Text variant="bodyMedium">{start.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={tokens.textPrimary} />
                <Text variant="bodyMedium">{start.time} - {end.time}</Text>
              </View>
              {event.uniform && (
                <Card elevation={0} style={styles.uniformCard}>
                  <Card.Content style={styles.uniformContent}>
                    <MaterialCommunityIcons name="tshirt-crew-outline" size={18} color={uniformIconColor} />
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
                      unselectedColor={rsvpUnselectedColor}
                    />
                  );
                })}
              </View>
              <View style={styles.rsvpBtnRow}>
                <RsvpButton
                  label="Maybe"
                  icon="help-circle-outline"
                  selected={myRsvp === 'maybe'}
                  color={tokens.statusWarnFg}
                  bgColor={tokens.statusWarnBg}
                  borderColor={tokens.statusWarnBorder}
                  count={maybeCount}
                  onPress={() => updateRsvp('maybe' as RSVPStatus)}
                  unselectedColor={rsvpUnselectedColor}
                />
                <RsvpButton
                  label="Can't Go"
                  icon="close-circle-outline"
                  selected={myRsvp === 'no'}
                  color={tokens.textMuted}
                  bgColor={tokens.surfaceVariant}
                  borderColor={tokens.border}
                  onPress={() => updateRsvp('no' as RSVPStatus)}
                  unselectedColor={rsvpUnselectedColor}
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
                color={tokens.statusGoodFg}
                bgColor={tokens.statusGoodBg}
                borderColor={tokens.statusGoodBorder}
                count={goingCount}
                onPress={() => updateRsvp('going' as RSVPStatus)}
                unselectedColor={rsvpUnselectedColor}
              />
              <RsvpButton
                label="Maybe"
                icon="help-circle-outline"
                selected={myRsvp === 'maybe'}
                color={tokens.statusWarnFg}
                bgColor={tokens.statusWarnBg}
                borderColor={tokens.statusWarnBorder}
                count={maybeCount}
                onPress={() => updateRsvp('maybe' as RSVPStatus)}
                unselectedColor={rsvpUnselectedColor}
              />
              <RsvpButton
                label="Can't Go"
                icon="close-circle-outline"
                selected={myRsvp === 'no'}
                color={tokens.textMuted}
                bgColor={tokens.surfaceVariant}
                borderColor={tokens.border}
                onPress={() => updateRsvp('no' as RSVPStatus)}
                unselectedColor={rsvpUnselectedColor}
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
                label={getInitials(comment.users.first_name, comment.users.last_name)}
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

          {/* Student: comment input is inline at the end of the ScrollView. */}
          {!isAdmin && commentInput}
        </ScrollView>

        {/* Admin: comment input docks to the keyboard as a sticky footer. */}
        {isAdmin && commentInput}
      </KeyboardAvoidingView>
    </>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  // container background drifted between roles (admin: surface, student:
  // background); preserved per-role via containerAdmin/containerStudent.
  containerAdmin: { flex: 1, backgroundColor: t.surface },
  containerStudent: { flex: 1, backgroundColor: t.background },
  // content paddingBottom drifted (admin: 16, student: 32); preserved per-role.
  contentAdmin: { padding: 16, paddingBottom: 16 },
  contentStudent: { padding: 16, paddingBottom: 32 },
  adminActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  actionSpacer: { flex: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  editSection: { gap: 12, marginBottom: 8 },
  editInput: { backgroundColor: t.surface },
  saveButton: { borderRadius: 12, marginTop: 4 },
  title: { fontWeight: '700', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  uniformCard: { backgroundColor: t.accentContainer, marginTop: 12 },
  uniformContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uniformText: { color: t.accent },
  divider: { marginVertical: 16 },
  description: { color: t.textSecondary, lineHeight: 22 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },

  // RSVP section
  rsvpSection: { gap: 12, marginBottom: 12 },
  rsvpGroupLabel: { color: t.textSecondary, fontWeight: '500' },
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
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  optionChipSelected: {
    backgroundColor: t.statusGoodBg,
    borderColor: t.statusGoodBorder,
  },
  optionChipText: { fontSize: 13, fontWeight: '500' },
  optionChipTextSelected: { color: t.statusGoodFg, fontWeight: '700' },

  // Attendees
  attendeesSection: { gap: 6, marginBottom: 4 },
  attendeeGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  attendeesLabel: { fontWeight: '600', color: t.textSecondary },
  attendeesText: { color: t.textSecondary, flex: 1 },

  // Comments
  comment: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  commentAvatar: { backgroundColor: t.surfaceVariant },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: '600', marginBottom: 2 },
  commentTime: { color: t.textMuted, marginTop: 4 },
  // Admin: sticky footer that docks to the keyboard (rendered outside ScrollView).
  commentInputDocked: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 8, paddingTop: 8, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border },
  commentTextInputDocked: { flex: 1, backgroundColor: t.surface, maxHeight: 100 },
  // Student: inline input at the end of the ScrollView.
  commentInputInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  commentTextInput: { flex: 1, backgroundColor: t.surface },
});
