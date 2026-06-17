import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { DEMO_MODE } from '@/lib/demo';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

/**
 * Lightweight hook for reading push notification permission status and
 * requesting permission. Actual token registration and server sync is
 * handled by PushNotificationsProvider.
 */
function usePushNotificationsReal(_userId: string) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [loading, setLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    if (!Device.isDevice || Platform.OS === 'web') {
      setPermissionStatus('denied');
      setLoading(false);
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(
      status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined'
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestPermission = useCallback(async () => {
    if (!Device.isDevice || Platform.OS === 'web') return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    setPermissionStatus(finalStatus === 'granted' ? 'granted' : 'denied');
    return finalStatus === 'granted' ? 'granted' : null;
  }, []);

  return {
    permissionStatus,
    expoPushToken: null as string | null,
    loading,
    requestPermission,
    unregister: async () => {},
  };
}

function usePushNotificationsDemo(_userId: string) {
  return {
    permissionStatus: 'granted' as PermissionStatus,
    expoPushToken: null as string | null,
    loading: false,
    requestPermission: async (): Promise<'granted' | null> => 'granted',
    unregister: async () => {},
  };
}

export const usePushNotifications = DEMO_MODE
  ? usePushNotificationsDemo
  : usePushNotificationsReal;
