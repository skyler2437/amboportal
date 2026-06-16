import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Star, StarOff, Trash2 } from 'lucide-react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type SemanticTokens, space, fontSize, fontWeight } from '@/lib/theme';

const STAR_W = 76;
const DELETE_W = 76;
const OPEN_WIDTH = STAR_W + DELETE_W;
// Minimum horizontal travel (px) before we treat a drag as a swipe — high
// enough that taps and vertical scrolls aren't mistaken for swipes.
const SWIPE_MIN = 10;
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
 * gesture-handler dependency.
 *
 * The action buttons live INSIDE the animated row (positioned just off its right
 * edge) so they translate with it and are unambiguously on top — taps land on
 * them, not on the row beneath. Only a clear horizontal-left drag (or any
 * horizontal drag while already open, to swipe closed) is claimed, and once
 * claimed it's held, so the gesture wins over the FlatList's vertical scroll
 * while taps and vertical scrolls still pass through.
 */
export function SwipeableChatRow({ starred, onToggleStar, onDelete, children }: Props) {
  const { styles, tokens } = useThemedStyles(makeStyles);
  const translateX = useRef(new Animated.Value(0)).current;
  const restOffset = useRef(0); // 0 = closed, -OPEN_WIDTH = open
  const [open, setOpen] = useState(false);

  // Keep latest values readable from the once-created PanResponder.
  const openRef = useRef(open);
  openRef.current = open;
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

  const shouldClaim = (dx: number, dy: number) => {
    const horizontal = Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.2;
    // Claim left drags (to open) always; claim right drags only when open (to close).
    return horizontal && (dx < 0 || openRef.current);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => shouldClaim(g.dx, g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => shouldClaim(g.dx, g.dy),
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
  // @types/react 18, so the children's ReactNode shape isn't assignable to a
  // typed RN element's children. Behaviour is unaffected.
  const childrenNode: any = children;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]} {...pan.panHandlers}>
        <View style={styles.rowContent}>{childrenNode}</View>

        {/* Closes the row when tapped; covers the row content only, never the
            actions (which sit off the right edge), so action taps still land. */}
        {open && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => settle(false)} accessibilityLabel="Close actions" />
        )}

        {/* Just off the right edge; slides into view as the row translates left.
            Rendered last → on top, so its buttons receive taps. */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.action, styles.starAction]}
            onPress={handleStar}
            accessibilityLabel={starred ? 'Unstar chat' : 'Star chat'}
          >
            {starred ? <StarOff size={20} color={tokens.onAccent} /> : <Star size={20} color={tokens.onAccent} fill={tokens.onAccent} />}
            <Text style={styles.actionText}>{starred ? 'Unstar' : 'Star'}</Text>
          </Pressable>
          <Pressable
            style={[styles.action, styles.deleteAction]}
            onPress={handleDelete}
            accessibilityLabel="Delete chat"
          >
            <Trash2 size={20} color={tokens.onAccent} />
            <Text style={styles.actionText}>Delete</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { backgroundColor: t.surface, overflow: 'hidden' },
  row: { backgroundColor: t.surface },
  rowContent: { backgroundColor: t.surface },
  actions: {
    position: 'absolute',
    left: '100%',
    top: 0,
    bottom: 0,
    width: OPEN_WIDTH,
    flexDirection: 'row',
  },
  action: { width: STAR_W, alignItems: 'center', justifyContent: 'center', gap: space.xxs },
  starAction: { backgroundColor: t.statusWarnFg },
  deleteAction: { backgroundColor: t.statusBadFg, width: DELETE_W },
  actionText: { color: t.onAccent, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
