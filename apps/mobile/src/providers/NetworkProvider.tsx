import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import * as Network from 'expo-network';
import { supabase } from '@/lib/supabase';
import { getQueue, removeMutation, type QueuedMutation } from '@/lib/offline-queue';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  refresh: () => Promise<void>;
}

const NetworkContext = createContext<NetworkState | undefined>(undefined);

async function drainQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return;

  for (const mutation of queue) {
    try {
      let result: { error: any };

      if (mutation.type === 'insert') {
        result = await supabase.from(mutation.table).insert(mutation.data);
      } else if (mutation.type === 'update' && mutation.filter) {
        let query = supabase.from(mutation.table).update(mutation.data);
        for (const [key, value] of Object.entries(mutation.filter)) {
          query = query.eq(key, value as string);
        }
        result = await query;
      } else if (mutation.type === 'delete' && mutation.filter) {
        let query = supabase.from(mutation.table).delete();
        for (const [key, value] of Object.entries(mutation.filter)) {
          query = query.eq(key, value as string);
        }
        result = await query;
      } else {
        await removeMutation(mutation.id);
        continue;
      }

      if (!result.error) {
        await removeMutation(mutation.id);
      }
    } catch {
      // Stop processing if we hit a network error — we're likely still offline
      break;
    }
  }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const wasOfflineRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? null);
    } catch {
      // If we can't read network state, assume connected
    }
  }, []);

  useEffect(() => {
    // Read initial state
    refresh();

    // Subscribe to changes
    const subscription = Network.addNetworkStateListener((state) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? null);
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  // Only show offline when clearly disconnected (no network interface at all).
  // isInternetReachable can be null/false on simulators even with a working connection.
  const isOffline = !isConnected;

  // Drain offline queue when coming back online
  useEffect(() => {
    if (isOffline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      drainQueue();
    }
  }, [isOffline]);

  // Memoize so the context value only changes when network state changes,
  // rather than producing a fresh object on every render that re-renders all
  // useNetwork() consumers.
  const value = useMemo<NetworkState>(
    () => ({ isConnected, isInternetReachable, isOffline, refresh }),
    [isConnected, isInternetReachable, isOffline, refresh]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
