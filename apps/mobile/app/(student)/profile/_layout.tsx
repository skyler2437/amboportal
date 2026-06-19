import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
    </Stack>
  );
}
