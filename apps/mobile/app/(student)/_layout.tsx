import { Tabs, Redirect, Slot } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useBadgeCounts } from '@/hooks/useBadgeCounts';
import { LayoutDashboard, Calendar, MessageSquare, MessageCircle, UserCircle } from 'lucide-react-native';

export default function StudentLayout() {
  const { session, userRole } = useAuth();
  const userId = session?.user?.id || '';
  const { unreadChats } = useBadgeCounts(userId, 'student');

  // Keep navigator mounted during sign-out so RootNavigator can redirect to login
  // without destroying the navigation tree (which causes ErrorBoundary crash)
  if (!session) return <Slot />;

  // Only redirect when the role is definitively known and not a student.
  // While `userRole` is transiently null (still resolving, or a brief fetch
  // error), stay put instead of redirecting — redirecting on the null flicker
  // bounces the navigator and triggers a "Maximum update depth exceeded" loop.
  if (userRole && userRole !== 'student') {
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
      <Tabs.Screen name="resources" options={{ href: null }} />
      <Tabs.Screen name="new-submission" options={{ href: null }} />
    </Tabs>
  );
}
