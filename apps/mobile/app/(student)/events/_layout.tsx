import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function EventsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Events' }} />
      <Stack.Screen name="new" options={{ title: 'Create Event' }} />
      <Stack.Screen name="[id]" options={{ title: 'Event Details' }} />
    </Stack>
  );
}
