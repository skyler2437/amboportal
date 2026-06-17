import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function HomeLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="resources" options={{ title: 'Resources' }} />
      <Stack.Screen name="submissions/index" options={{ title: 'Submissions' }} />
      <Stack.Screen name="submissions/[id]" options={{ title: 'Submission Details' }} />
      <Stack.Screen name="users/index" options={{ title: 'Users' }} />
      <Stack.Screen name="users/[id]" options={{ title: 'User Details' }} />
      <Stack.Screen name="applications/index" options={{ title: 'Applications' }} />
      <Stack.Screen name="applications/[id]" options={{ title: 'Application Detail' }} />
    </Stack>
  );
}
