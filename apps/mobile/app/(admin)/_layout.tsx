import { Tabs, Redirect, Slot } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useBadgeCounts } from '@/hooks/useBadgeCounts';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAppTheme } from '@/lib/ThemeProvider';
import { LayoutDashboard, Calendar, MessageSquare, MessageCircle, UserCircle } from 'lucide-react-native';

export default function AdminLayout() {
  const { session, userRole } = useAuth();
  const { tokens } = useAppTheme();
  const userId = session?.user?.id || '';
  const { unreadChats, pendingSubmissions } = useBadgeCounts(userId, 'admin');

  // Keep navigator mounted during sign-out so RootNavigator can redirect to login
  // without destroying the navigation tree (which causes ErrorBoundary crash)
  if (!session) return <Slot />;

  // Role not resolved yet (still loading, or a transient/failed fetch). Don't
  // mount the protected tab tree for an unknown role, and don't redirect —
  // redirecting on the null flicker bounces the navigator and triggers a
  // "Maximum update depth exceeded" loop. Show a loading state until the role
  // is definitively known.
  if (!userRole) {
    return <LoadingScreen />;
  }

  // Definitively the wrong role → send them to their correct home.
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textMuted,
        tabBarStyle: {
          backgroundColor: tokens.surfaceElevated,
          borderTopColor: tokens.border,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
          tabBarBadge: pendingSubmissions > 0 ? pendingSubmissions : undefined,
          tabBarBadgeStyle: { backgroundColor: tokens.statusWarnFg, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: 'Posts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
          tabBarBadge: unreadChats > 0 ? unreadChats : undefined,
          tabBarBadgeStyle: { backgroundColor: tokens.accentSolid, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <UserCircle size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
