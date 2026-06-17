import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useThemeStore } from '@/stores/themeStore';
import {
  lightTokens,
  darkTokens,
  paperLight,
  paperDark,
  navLight,
  navDark,
  type SemanticTokens,
  type ThemeMode,
} from '@/lib/theme';

interface AppThemeValue {
  mode: ThemeMode;
  tokens: SemanticTokens;
}

/**
 * Non-null default so `useAppTheme()` never throws when read outside the
 * provider. RNScreens renders screens in a detached pass with no React context;
 * tab/stack `screenOptions` and some header renderers can evaluate there. They
 * must get a usable (light) fallback rather than crash.
 */
const AppThemeContext = createContext<AppThemeValue>({ mode: 'light', tokens: lightTokens });

export function useAppTheme(): AppThemeValue {
  return useContext(AppThemeContext);
}

/**
 * Single theming wrapper. Resolves the active mode from the persisted
 * preference + the OS color scheme, then provides:
 *  - our semantic tokens via AppThemeContext (read with useAppTheme)
 *  - the matching MD3 theme to PaperProvider (Paper components adapt for free)
 *  - the matching navigation theme to react-navigation (header/tab chrome)
 */
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const pref = useThemeStore((s) => s.pref);

  const mode: ThemeMode = pref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : pref;
  const tokens = mode === 'dark' ? darkTokens : lightTokens;
  const paperTheme = mode === 'dark' ? paperDark : paperLight;
  const navTheme = mode === 'dark' ? navDark : navLight;

  const value = useMemo<AppThemeValue>(() => ({ mode, tokens }), [mode, tokens]);

  return (
    <AppThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>
        {/* Cast: apps/mobile pins @types/react@19 while @react-navigation
            resolves @types/react@18, so their ReactNode types differ (React 19
            adds bigint). The runtime value is identical. */}
        <NavThemeProvider value={navTheme}>{children as any}</NavThemeProvider>
      </PaperProvider>
    </AppThemeContext.Provider>
  );
}
