import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { CheddarRain } from '@/components/CheddarRain';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SemanticTokens } from '@/lib/theme';

export default function AdminDashboard() {
  const router = useRouter();
  const { styles, tokens } = useThemedStyles(makeStyles);
  const [pendingCount, setPendingCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [cheddarActive, setCheddarActive] = useState(false);
  const hasLoadedOnce = useRef(false);

  const fetchStats = async () => {
    const [pendingRes, usersRes, applicationsRes, submissionsRes] = await Promise.all([
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('submissions').select('id', { count: 'exact', head: true }),
    ]);
    setPendingCount(pendingRes.count || 0);
    setUserCount(usersRes.count || 0);
    setApplicationCount(applicationsRes.count || 0);
    setSubmissionCount(submissionsRes.count || 0);
    hasLoadedOnce.current = true;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Refetch when screen comes back into focus
  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  if (!hasLoadedOnce.current) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => setCheddarActive(true)}
              disabled={cheddarActive}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Make it rain cheddar"
            >
              <Text style={styles.cheddarEmoji}>🧀</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.statsGrid}>
        <Pressable style={[styles.statCard, pendingCount > 0 && styles.pendingCard]} onPress={() => router.push('/(admin)/(home)/submissions')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="file-clock-outline" size={22} color={pendingCount > 0 ? tokens.statusWarnFg : tokens.textMuted} />
              <Text variant="titleMedium" style={styles.statLabel}>Pending Reviews</Text>
              <Text variant="headlineMedium" style={styles.statValue}>{pendingCount}</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/(admin)/(home)/users')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color={tokens.textPrimary} />
              <Text variant="titleMedium" style={styles.statLabel}>Users</Text>
              <Text variant="headlineMedium" style={styles.statValue}>{userCount}</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={[styles.statCard, applicationCount > 0 && styles.applicationCard]} onPress={() => router.push('/(admin)/(home)/applications')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={applicationCount > 0 ? tokens.statusInfoFg : tokens.textMuted} />
              <Text variant="titleMedium" style={styles.statLabel}>Applications</Text>
              <Text variant="headlineMedium" style={styles.statValue}>{applicationCount}</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/(admin)/(home)/submissions')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={tokens.textPrimary} />
              <Text variant="titleMedium" style={styles.statLabel}>Submissions</Text>
              <Text variant="headlineMedium" style={styles.statValue}>{submissionCount}</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/(admin)/(home)/resources')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="folder-outline" size={22} color={tokens.statusGoodFg} />
              <Text variant="titleMedium" style={styles.statLabel}>Resources</Text>
              <Text variant="headlineMedium" style={styles.statValue}>&mdash;</Text>
            </Card.Content>
          </Card>
        </Pressable>
      </View>
      </ScrollView>
      <CheddarRain isActive={cheddarActive} onComplete={() => setCheddarActive(false)} />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: t.background },
  flex: { flex: 1 },
  cheddarEmoji: { fontSize: 20, marginRight: 4 },
  content: { padding: 16, paddingBottom: 32 },
  statsGrid: { gap: 12 },
  statCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' },
  cardInner: { backgroundColor: 'transparent' },
  pendingCard: { backgroundColor: t.statusWarnBg },
  applicationCard: { backgroundColor: t.statusInfoBg },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  statValue: { fontWeight: '700' },
  statLabel: { flex: 1, color: t.textPrimary, fontWeight: '500' },
});
