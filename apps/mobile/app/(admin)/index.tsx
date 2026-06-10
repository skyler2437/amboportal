import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.statsGrid}>
        <Pressable style={[styles.statCard, pendingCount > 0 && styles.pendingCard]} onPress={() => router.push('/(admin)/submissions')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="file-clock-outline" size={22} color={pendingCount > 0 ? '#f59e0b' : '#9ca3af'} />
              <Text variant="headlineMedium" style={styles.statValue}>{pendingCount}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Pending Reviews</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/(admin)/users')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#111827" />
              <Text variant="headlineMedium" style={styles.statValue}>{userCount}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Users</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={[styles.statCard, applicationCount > 0 && styles.applicationCard]} onPress={() => router.push('/(admin)/applications')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={applicationCount > 0 ? '#3b82f6' : '#9ca3af'} />
              <Text variant="headlineMedium" style={styles.statValue}>{applicationCount}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Applications</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/(admin)/submissions')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color="#111827" />
              <Text variant="headlineMedium" style={styles.statValue}>{submissionCount}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Submissions</Text>
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/(admin)/resources')}>
          <Card elevation={0} style={styles.cardInner}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="folder-outline" size={22} color="#16a34a" />
              <Text variant="headlineMedium" style={styles.statValue}>&mdash;</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Resources</Text>
            </Card.Content>
          </Card>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' },
  cardInner: { backgroundColor: 'transparent' },
  pendingCard: { backgroundColor: '#fffbeb' },
  applicationCard: { backgroundColor: '#eff6ff' },
  statContent: { alignItems: 'center', gap: 4, paddingVertical: 16 },
  statValue: { fontWeight: '700' },
  statLabel: { color: '#6b7280', textAlign: 'center' },
});
