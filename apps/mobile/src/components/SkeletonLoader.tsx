import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonItem({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonItem width={40} height={40} borderRadius={20} />
        <View style={styles.cardHeaderText}>
          <SkeletonItem width={120} height={14} />
          <SkeletonItem width={80} height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      <SkeletonItem height={14} style={{ marginTop: 12 }} />
      <SkeletonItem width="75%" height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

export function ListItemSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.listItem}>
      <SkeletonItem width={36} height={36} borderRadius={18} />
      <View style={styles.listItemText}>
        <SkeletonItem width={140} height={14} />
        <SkeletonItem width={200} height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function StatCardSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.statCard}>
      <SkeletonItem width={24} height={24} borderRadius={4} />
      <SkeletonItem width={48} height={28} style={{ marginTop: 8 }} />
      <SkeletonItem width={64} height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

export function DashboardSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.dashboardContainer}>
      <SkeletonItem width={180} height={24} />
      <SkeletonItem width={240} height={14} style={{ marginTop: 8 }} />
      <View style={styles.statsRow}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </View>
      <SkeletonItem width={120} height={18} style={{ marginTop: 24 }} />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </View>
  );
}

export function SubmissionListSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.statsRow}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </View>
      {[1, 2, 3, 4].map((i) => (
        <ListItemSkeleton key={i} />
      ))}
    </View>
  );
}

export function PostListSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.dashboardContainer}>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </View>
  );
}

export function EventListSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.dashboardContainer}>
      <SkeletonItem width={100} height={14} style={{ marginBottom: 8 }} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.card}>
          <SkeletonItem width="60%" height={16} />
          <SkeletonItem width="40%" height={12} style={{ marginTop: 8 }} />
          <SkeletonItem width="80%" height={12} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function ChatListSkeleton() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.dashboardContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <ListItemSkeleton key={i} />
      ))}
    </View>
  );
}

export { SkeletonItem };

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  skeleton: {
    backgroundColor: t.skeleton,
  },
  card: {
    backgroundColor: t.skeletonHighlight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: t.divider,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderText: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  listItemText: {
    flex: 1,
  },
  statCard: {
    flex: 1,
    backgroundColor: t.skeletonHighlight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dashboardContainer: {
    padding: 16,
  },
});
