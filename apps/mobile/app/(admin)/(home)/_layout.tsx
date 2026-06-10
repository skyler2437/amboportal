import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function HomeLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
    </Stack>
  );
}
