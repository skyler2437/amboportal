import { useAppTheme } from '@/lib/ThemeProvider';

/**
 * Shared native-stack screen options, theme-aware.
 *
 * headerBackButtonDisplayMode 'minimal' renders the iOS back button as a
 * bare chevron with no text label (native-stack 7 removed
 * headerBackTitleVisible). No-op on Android, which is already minimal.
 *
 * headerStyle.backgroundColor is set explicitly to an opaque surface color.
 * Without it, react-native-screens leaves the iOS navigation bar's
 * scrollEdgeAppearance transparent and its standardAppearance using the
 * system blur material — so the bar looks clear at the top of a scroll and
 * turns into a frosted/"glassy" bar only once content scrolls underneath it.
 * Forcing an opaque background makes both appearances render the same flat,
 * solid header in every scroll position (and in both light/dark themes).
 */
export function useStackScreenOptions() {
  const { tokens } = useAppTheme();
  return {
    headerBackButtonDisplayMode: 'minimal' as const,
    headerStyle: { backgroundColor: tokens.surfaceElevated },
    headerTintColor: tokens.accent,
    headerTitleStyle: { color: tokens.textPrimary },
  };
}
