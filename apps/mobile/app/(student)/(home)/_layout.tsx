import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function HomeLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="submissions" options={{ title: 'Submissions' }} />
      <Stack.Screen name="resources" options={{ title: 'Resources' }} />
      <Stack.Screen name="new-submission" options={{ title: 'New Submission' }} />
    </Stack>
  );
}
