import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

export type ThemeMode = 'light' | 'dark';

/**
 * Semantic color tokens — the single vocabulary every component reads from.
 * `lightTokens` and `darkTokens` share the exact same shape (enforced by the
 * `SemanticTokens` interface), so a forgotten dark value is a compile error
 * rather than a wrong color shipped. Components never reference a hex literal;
 * they reference `tokens.surface`, `tokens.textPrimary`, etc.
 */
export interface SemanticTokens {
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceElevated: string;
  skeleton: string;
  skeletonHighlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  /** Brand blue for foreground tints (icons, links, active tab). */
  accent: string;
  /** Brand blue for solid fills (FAB, contained buttons, unread dot). */
  accentSolid: string;
  accentContainer: string;
  onAccent: string;
  secondary: string;
  statusGoodFg: string;
  statusGoodBg: string;
  statusGoodBorder: string;
  statusWarnFg: string;
  statusWarnBg: string;
  statusWarnBorder: string;
  statusBadFg: string;
  statusBadBg: string;
  statusBadBorder: string;
  statusInfoFg: string;
  statusInfoBg: string;
  overlay: string;
  onAccentOverlay: string;
  /** Drop-shadow opacity; 0 in dark (separation comes from surface/border). */
  shadowOpacity: number;
}

export const lightTokens: SemanticTokens = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceVariant: '#f5f5f5',
  surfaceElevated: '#ffffff',
  skeleton: '#e5e7eb',
  skeletonHighlight: '#f9fafb',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  divider: '#f3f4f6',
  accent: '#005EFF',
  accentSolid: '#005EFF',
  accentContainer: '#EBF2FF',
  onAccent: '#ffffff',
  secondary: '#6366f1',
  statusGoodFg: '#10b981',
  statusGoodBg: '#ecfdf5',
  statusGoodBorder: '#a7f3d0',
  statusWarnFg: '#f59e0b',
  statusWarnBg: '#fffbeb',
  statusWarnBorder: '#fde68a',
  statusBadFg: '#ef4444',
  statusBadBg: '#fef2f2',
  statusBadBorder: '#fecaca',
  statusInfoFg: '#3b82f6',
  statusInfoBg: '#eff6ff',
  overlay: 'rgba(0,0,0,0.5)',
  onAccentOverlay: 'rgba(255,255,255,0.25)',
  shadowOpacity: 0.06,
};

export const darkTokens: SemanticTokens = {
  background: '#0f1115',
  surface: '#181b20',
  surfaceVariant: '#22262e',
  surfaceElevated: '#1f232b',
  skeleton: '#2a2f37',
  skeletonHighlight: '#1c2026',
  textPrimary: '#f3f5f8',
  textSecondary: '#aab2bd',
  textMuted: '#737d8a',
  border: '#2c313a',
  divider: '#23272f',
  accent: '#3b82f6',
  accentSolid: '#005EFF',
  accentContainer: '#16243f',
  onAccent: '#ffffff',
  secondary: '#818cf8',
  statusGoodFg: '#34d399',
  statusGoodBg: '#0e2b22',
  statusGoodBorder: '#1c4a3a',
  statusWarnFg: '#fbbf24',
  statusWarnBg: '#332a12',
  statusWarnBorder: '#5a4a1e',
  statusBadFg: '#f87171',
  statusBadBg: '#3a1d1d',
  statusBadBorder: '#5e2b2b',
  statusInfoFg: '#60a5fa',
  statusInfoBg: '#16243f',
  overlay: 'rgba(0,0,0,0.6)',
  onAccentOverlay: 'rgba(255,255,255,0.25)',
  shadowOpacity: 0,
};

export function tokensFor(mode: ThemeMode): SemanticTokens {
  return mode === 'dark' ? darkTokens : lightTokens;
}

/** Build an MD3 Paper theme whose colors are derived from semantic tokens, so
 * Paper components and our own tokens never drift apart. */
function buildPaperTheme(base: MD3Theme, t: SemanticTokens): MD3Theme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: t.accent,
      onPrimary: t.onAccent,
      primaryContainer: t.accentContainer,
      secondary: t.secondary,
      background: t.background,
      surface: t.surface,
      surfaceVariant: t.surfaceVariant,
      onSurface: t.textPrimary,
      onSurfaceVariant: t.textSecondary,
      outline: t.border,
      outlineVariant: t.divider,
      error: t.statusBadFg,
    },
  };
}

export const paperLight: MD3Theme = buildPaperTheme(MD3LightTheme, lightTokens);
export const paperDark: MD3Theme = buildPaperTheme(MD3DarkTheme, darkTokens);

// --- Navigation chrome (headers, tab bars) ------------------------------------
const { LightTheme: adaptedLight, DarkTheme: adaptedDark } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
  materialLight: paperLight,
  materialDark: paperDark,
});

export const navLight = {
  ...adaptedLight,
  colors: {
    ...adaptedLight.colors,
    background: lightTokens.background,
    card: lightTokens.surfaceElevated,
    text: lightTokens.textPrimary,
    border: lightTokens.border,
    primary: lightTokens.accent,
  },
};

export const navDark = {
  ...adaptedDark,
  colors: {
    ...adaptedDark.colors,
    background: darkTokens.background,
    card: darkTokens.surfaceElevated,
    text: darkTokens.textPrimary,
    border: darkTokens.border,
    primary: darkTokens.accent,
  },
};

// --- Mode-aware semantic palettes (badges, tints) -----------------------------

export interface BadgeColors {
  bg: string;
  text: string;
  border: string;
}

/** Submission status badge colors (Approved/Pending/Denied). */
export function getStatusColors(
  mode: ThemeMode,
): Record<'Approved' | 'Pending' | 'Denied', BadgeColors> {
  const t = tokensFor(mode);
  return {
    Approved: { bg: t.statusGoodBg, text: t.statusGoodFg, border: t.statusGoodBorder },
    Pending: { bg: t.statusWarnBg, text: t.statusWarnFg, border: t.statusWarnBorder },
    Denied: { bg: t.statusBadBg, text: t.statusBadFg, border: t.statusBadBorder },
  };
}

/** User role badge colors. */
export function getRoleColors(mode: ThemeMode): Record<string, { bg: string; text: string }> {
  const t = tokensFor(mode);
  const isDark = mode === 'dark';
  return {
    admin: { bg: t.accentContainer, text: t.accent },
    superadmin: { bg: isDark ? '#2a1f44' : '#f5f3ff', text: isDark ? '#c4b5fd' : '#7c3aed' },
    student: { bg: t.statusGoodBg, text: t.statusGoodFg },
    basic: { bg: t.surfaceVariant, text: t.textSecondary },
    applicant: { bg: t.statusWarnBg, text: t.statusWarnFg },
  };
}

/** Event card tints by RSVP status (going/maybe/no). Shared by the admin and
 * student event lists, which previously each held a duplicate CARD_TINT. */
export function getRsvpTint(
  mode: ThemeMode,
): Record<'going' | 'maybe' | 'no', { bg: string; border: string; accent: string }> {
  const t = tokensFor(mode);
  return {
    going: { bg: t.statusGoodBg, border: t.statusGoodBorder, accent: t.statusGoodFg },
    maybe: { bg: t.statusWarnBg, border: t.statusWarnBorder, accent: t.statusWarnFg },
    no: { bg: t.surfaceVariant, border: t.border, accent: t.textMuted },
  };
}

/** Default (no-RSVP) event card tint. */
export function getDefaultCardTint(mode: ThemeMode): { bg: string; border: string; accent: string } {
  const t = tokensFor(mode);
  return { bg: t.surface, border: t.border, accent: 'transparent' };
}

/** Application status styles (submitted/approved/rejected/draft) + icon names. */
export function getApplicationStatusStyles(
  mode: ThemeMode,
): Record<'submitted' | 'approved' | 'rejected' | 'draft', { bg: string; text: string; icon: string }> {
  const t = tokensFor(mode);
  return {
    submitted: { bg: t.statusInfoBg, text: t.statusInfoFg, icon: 'file-document-outline' },
    approved: { bg: t.statusGoodBg, text: t.statusGoodFg, icon: 'check-circle-outline' },
    rejected: { bg: t.statusBadBg, text: t.statusBadFg, icon: 'close-circle-outline' },
    draft: { bg: t.surfaceVariant, text: t.textSecondary, icon: 'pencil-outline' },
  };
}
