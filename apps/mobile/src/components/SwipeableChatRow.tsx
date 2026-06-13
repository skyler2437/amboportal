import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Star, StarOff, Trash2 } from 'lucide-react-native';

const STAR_W = 76;
const DELETE_W = 76;
const OPEN_WIDTH = STAR_W + DELETE_W;
// Drag at least this far (px) on release to settle the row open.
const SNAP = 60;

interface Props {
  starred: boolean;
  onToggleStar: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

/**
 * Wraps a chat-list row with a left-swipe that reveals tappable Star/Unstar and
 * Delete actions (iOS-Mail style). Built on PanResponder + Animated — no native
 * gesture-handler dependency. Horizontal drags are claimed early (capture phase)
 * and held so they win over the FlatList's vertical scroll; vertical drags pass
 * through. Tapping the row (or swiping back) while open just closes it.
 */
export function SwipeableChatRow({ starred, onToggleStar, onDelete, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const restOffset = useRef(0); // 0 = closed, -OPEN_WIDTH = open
  const [open, setOpen] = useState(false);

  // Keep the latest callbacks so the once-created PanResponder never goes stale.
  const toggleRef = useRef(onToggleStar);
  toggleRef.current = onToggleStar;
  const deleteRef = useRef(onDelete);
  deleteRef.current = onDelete;

  const settle = (toOpen: boolean) => {
    restOffset.current = toOpen ? -OPEN_WIDTH : 0;
    setOpen(toOpen);
    Animated.spring(translateX, {
      toValue: restOffset.current,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      // Once we own the gesture, don't hand it back to the scroll view.
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const next = restOffset.current + g.dx;
        translateX.setValue(Math.max(Math.min(next, 0), -OPEN_WIDTH));
      },
      onPanResponderRelease: (_, g) => {
        const next = restOffset.current + g.dx;
        settle(next <= -SNAP);
      },
      onPanResponderTerminate: () => settle(false),
    }),
  ).current;

  const handleStar = () => {
    settle(false);
    toggleRef.current();
  };
  const handleDelete = () => {
    settle(false);
    deleteRef.current();
  };

  // Cast: this app pins @types/react 19 while react-native's types resolve to
  // @types/react 18, so the children's ReactNode shape isn't assignable to
  // Animated.View's children type. Behaviour is unaffected.
  const inner: any = (
    <>
      {children}
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => settle(false)} accessibilityLabel="Close actions" />
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Pressable
          style={[styles.action, styles.starAction]}
          onPress={handleStar}
          accessibilityLabel={starred ? 'Unstar chat' : 'Star chat'}
        >
          {starred ? <StarOff size={20} color="#fff" /> : <Star size={20} color="#fff" fill="#fff" />}
          <Text style={styles.actionText}>{starred ? 'Unstar' : 'Star'}</Text>
        </Pressable>
        <Pressable
          style={[styles.action, styles.deleteAction]}
          onPress={handleDelete}
          accessibilityLabel="Delete chat"
        >
          <Trash2 size={20} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]} {...pan.panHandlers}>
        {inner}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', overflow: 'hidden' },
  actions: { position: 'absolute', right: 0, top: 0, bottom: 0, width: OPEN_WIDTH, flexDirection: 'row' },
  action: { width: STAR_W, alignItems: 'center', justifyContent: 'center', gap: 2 },
  starAction: { backgroundColor: '#f59e0b' },
  deleteAction: { backgroundColor: '#ef4444', width: DELETE_W },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  row: { backgroundColor: '#fff' },
});
