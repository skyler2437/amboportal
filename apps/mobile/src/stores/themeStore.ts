import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ambo:themePref';

export type ThemePref = 'system' | 'light' | 'dark';

interface ThemeStore {
  /** User preference. 'system' follows the OS appearance; light/dark override it. */
  pref: ThemePref;
  loaded: boolean;
  setPref: (pref: ThemePref) => void;
  hydrate: () => Promise<void>;
}

/**
 * Persisted theme preference. Mirrors the chatReadStore pattern: zustand state
 * with AsyncStorage hydrate-on-boot and background writes.
 */
export const useThemeStore = create<ThemeStore>((set, get) => ({
  pref: 'system',
  loaded: false,

  setPref: (pref) => {
    set({ pref });
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  },

  hydrate: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'system' || raw === 'light' || raw === 'dark') {
        set({ pref: raw, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
}));
