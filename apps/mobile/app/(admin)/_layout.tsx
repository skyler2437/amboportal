import { Tabs, Redirect, Slot } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useBadgeCounts } from '@/hooks/useBadgeCounts';
import { LoadingScreen } from '@/components/LoadingScreen';
import { LayoutDashboard, Calendar, MessageSquare, MessageCircle, UserCircle } from 'lucide-react-native';

export default function AdminLayout() {
  const { session, userRole } = useAuth();
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
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
          tabBarBadge: pendingSubmissions > 0 ? pendingSubmissions : undefined,
          tabBarBadgeStyle: { backgroundColor: '#f59e0b', fontSize: 10 },
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
          tabBarBadgeStyle: { backgroundColor: '#111827', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <UserCircle size={size} color={color} />
          ),
        }}
      />
      {/* Hidden from tab bar but still accessible via navigation */}
      <Tabs.Screen name="submissions" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="users" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="resources" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="applications" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
