import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function ChatLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
      <Stack.Screen name="[id]" options={{ title: 'Loading...' }} />
      <Stack.Screen name="new" options={{ title: 'New Chat' }} />
      <Stack.Screen name="edit" options={{ title: 'Chat Settings' }} />
    </Stack>
  );
}
