import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Users, FileText, Clock, LogOut } from 'lucide-react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, fontSize, fontWeight, type SemanticTokens } from '@/lib/theme';

export default function WelcomeScreen() {
  const { userRole, signOut, refreshRole } = useAuth();
  const { styles, tokens } = useThemedStyles(makeStyles);
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
            <Users size={28} color={tokens.secondary} />
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
              <Clock size={28} color={tokens.statusWarnFg} />
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
              <FileText size={28} color={tokens.statusGoodFg} />
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
          <LogOut size={18} color={tokens.textSecondary} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  container: { flexGrow: 1, padding: space.xl, paddingTop: space.xxl },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    color: t.textPrimary,
    marginBottom: space.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: t.textSecondary,
    textAlign: 'center',
    marginBottom: space.xxl,
  },
  card: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    padding: space.xl,
    marginBottom: space.lg,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: t.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: t.textPrimary,
    marginBottom: space.sm,
  },
  cardBody: {
    fontSize: fontSize.lg,
    color: t.textSecondary,
    lineHeight: 22,
  },
  contactText: {
    fontSize: fontSize.lg,
    color: t.secondary,
    fontWeight: fontWeight.semibold,
    marginTop: space.sm,
  },
  applyButton: {
    backgroundColor: t.accentSolid,
    borderRadius: radius.sm,
    padding: space.lg,
    alignItems: 'center',
    marginTop: space.lg,
  },
  applyButtonText: {
    color: t.onAccent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.xl,
    padding: space.md,
  },
  signOutText: {
    fontSize: fontSize.lg,
    color: t.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
