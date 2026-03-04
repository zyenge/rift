import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../lib/auth.store';
import { useNotifications } from '../hooks/useNotifications';

export default function RootLayout() {
  const { token, isLoading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useNotifications();

  useEffect(() => {
    initialize();
  }, []);

  // Navigate to request when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const requestId = response.notification.request.content.data?.requestId;
      if (requestId) {
        router.push(`/request/${requestId}`);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0D0D0F' },
        headerTintColor: '#F2F2F5',
        headerTitleStyle: { fontWeight: '700', color: '#F2F2F5' },
        contentStyle: { backgroundColor: '#0D0D0F' },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="request/new"
        options={{ presentation: 'modal', title: 'New Request', headerBackTitle: 'Cancel' }}
      />
      <Stack.Screen name="request/[id]" options={{ title: 'Request', headerBackTitle: 'Back' }} />
      <Stack.Screen name="fulfill/[id]" options={{ title: 'Fulfill Request', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
