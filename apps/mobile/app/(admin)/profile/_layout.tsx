import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
    </Stack>
  );
}
