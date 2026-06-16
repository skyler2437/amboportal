import { useMemo } from 'react';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens, ThemeMode } from '@/lib/theme';

/**
 * Builds a per-mode StyleSheet from a `makeStyles(tokens)` factory and returns
 * it alongside the active tokens/mode. Replaces the repeated boilerplate:
 *
 *   const { tokens } = useAppTheme();
 *   const styles = useMemo(() => makeStyles(tokens), [tokens]);
 *
 * with:
 *
 *   const { styles, tokens } = useThemedStyles(makeStyles);
 *
 * The factory is expected to be a module-scope constant (stable identity).
 */
export function useThemedStyles<T>(
  factory: (tokens: SemanticTokens) => T,
): { styles: T; tokens: SemanticTokens; mode: ThemeMode } {
  const { tokens, mode } = useAppTheme();
  const styles = useMemo(() => factory(tokens), [tokens, factory]);
  return { styles, tokens, mode };
}
