import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function UsersLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Users' }} />
      <Stack.Screen name="[id]" options={{ title: 'User Details' }} />
    </Stack>
  );
}
