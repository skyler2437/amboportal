import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Star, StarOff } from 'lucide-react-native';

const ACTION_WIDTH = 88;
// Drag at least this far left (px) before release to fire the toggle.
const TRIGGER = 56;

interface Props {
  starred: boolean;
  onToggleStar: () => void;
  children: React.ReactNode;
}

/**
 * Wraps a chat-list row with a left-swipe gesture that stars/unstars the chat.
 * Built on React Native's PanResponder + Animated (no native gesture-handler
 * dependency). Vertical drags fall through to the FlatList; taps fall through
 * to the row's own Pressable — only a clear horizontal-left swipe is claimed.
 */
export function SwipeableChatRow({ starred, onToggleStar, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  // Keep the latest callback so the once-created PanResponder never goes stale.
  const toggleRef = useRef(onToggleStar);
  toggleRef.current = onToggleStar;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dx < 0 && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -ACTION_WIDTH));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -TRIGGER) toggleRef.current();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.action} pointerEvents="none">
        {starred ? <StarOff size={22} color="#fff" /> : <Star size={22} color="#fff" fill="#fff" />}
        <Text style={styles.actionText}>{starred ? 'Unstar' : 'Star'}</Text>
      </View>
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]} {...pan.panHandlers}>
        {/* cast: this app pins @types/react 19 while react-native's types resolve
            to @types/react 18, so their ReactNode shapes are not assignable. */}
        {children as any}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f59e0b' },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  row: { backgroundColor: '#fff' },
});
