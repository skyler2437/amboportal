import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface UseListScreenArgs<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown> | void;
}

interface UseListScreenResult {
  /** True only on the very first load (no data yet) — render a skeleton. */
  isInitialLoading: boolean;
  /** Error message to show (only when there's no data) — render <ErrorState>. */
  listError: string | null;
  /** Pass to the FlatList/SectionList `refreshControl` prop. Typed `any` to
   *  bridge the @types/react 18 (react-native) vs 19 (apps/mobile) element-type
   *  mismatch, so consumers need no cast. */
  refreshControl: any;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

/**
 * Encapsulates the repeated list-screen scaffolding: initial-load tracking,
 * pull-to-refresh state, and a silent refetch on screen focus. The screen
 * keeps rendering its own skeleton/empty components and its FlatList vs
 * SectionList choice; this just removes the boilerplate.
 */
export function useListScreen<T>({ data, loading, error, refetch }: UseListScreenArgs<T>): UseListScreenResult {
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);

  if (!loading && !initialLoadDone.current) {
    initialLoadDone.current = true;
  }

  // Silent refetch when the screen regains focus (no spinner) — only after the
  // first load, so we don't double-fetch on mount.
  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) {
        refetch();
      }
    }, [refetch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return {
    isInitialLoading: loading && data.length === 0 && !initialLoadDone.current,
    listError: error && data.length === 0 ? error : null,
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    refreshing,
    onRefresh,
  };
}
