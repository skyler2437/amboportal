import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Users, FileText, Clock, LogOut } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { userRole, signOut, refreshRole } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshRole();
      // If role changed to student/admin, the root layout routing will
      // automatically redirect away from this screen.
    } catch (err) {
      if (__DEV__) console.error('[Welcome] refreshRole error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshRole]);

  const isApplicant = userRole === 'applicant';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Welcome to AmboPortal</Text>
        <Text style={styles.subtitle}>
          {isApplicant
            ? 'Your application has been submitted.'
            : 'Choose how to get started.'}
        </Text>

        {/* Card 1: Current Ambassador */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Users size={28} color="#4f46e5" />
          </View>
          <Text style={styles.cardTitle}>Current Student Ambassador?</Text>
          <Text style={styles.cardBody}>
            If you are already a student ambassador, please contact the Student
            Ambassador Program coordinator to have your account set up.
          </Text>
          <Text style={styles.cardBody}>
            Contact your program coordinator to have your account set up.
          </Text>
        </View>

        {/* Card 2: Apply or Status */}
        {isApplicant ? (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Clock size={28} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Application Under Review</Text>
            <Text style={styles.cardBody}>
              Your application is being reviewed. You will be contacted when a
              decision has been made. Thank you for your patience!
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <FileText size={28} color="#10b981" />
            </View>
            <Text style={styles.cardTitle}>Want to Become an Ambassador?</Text>
            <Text style={styles.cardBody}>
              If you are interested in applying to be a student ambassador, you
              can start your application below.
            </Text>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => router.push('/(auth)/apply')}
            >
              <Text style={styles.applyButtonText}>Start Application</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={async () => {
          await signOut();
          router.replace('/(auth)/login');
        }}>
          <LogOut size={18} color="#6b7280" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { flexGrow: 1, padding: 24, paddingTop: 48 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  contactText: {
    fontSize: 15,
    color: '#4f46e5',
    fontWeight: '600',
    marginTop: 8,
  },
  applyButton: {
    backgroundColor: '#005EFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  signOutText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
});
