import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function SubmissionsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Submissions' }} />
      <Stack.Screen name="[id]" options={{ title: 'Submission Details' }} />
    </Stack>
  );
}
