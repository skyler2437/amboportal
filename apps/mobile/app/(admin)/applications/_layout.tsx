import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function ApplicationsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Applications' }} />
      <Stack.Screen name="[id]" options={{ title: 'Application Detail' }} />
    </Stack>
  );
}
