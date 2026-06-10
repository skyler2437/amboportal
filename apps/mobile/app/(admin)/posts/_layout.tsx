import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function PostsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Posts' }} />
      <Stack.Screen name="[id]" options={{ title: 'Post' }} />
      <Stack.Screen name="new" options={{ title: 'New Post' }} />
    </Stack>
  );
}
