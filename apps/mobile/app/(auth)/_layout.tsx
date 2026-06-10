import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...stackScreenOptions }}>
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{
          headerShown: true,
          title: 'Create Account',
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: true,
          title: 'Forgot Password',
        }}
      />
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="apply"
        options={{
          headerShown: true,
          title: 'Apply',
        }}
      />
    </Stack>
  );
}
