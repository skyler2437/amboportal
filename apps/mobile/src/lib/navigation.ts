/**
 * Shared native-stack screen options.
 *
 * headerBackButtonDisplayMode 'minimal' renders the iOS back button as a
 * bare chevron with no text label (native-stack 7 removed
 * headerBackTitleVisible). No-op on Android, which is already minimal.
 */
export const stackScreenOptions = {
  headerBackButtonDisplayMode: 'minimal' as const,
};
