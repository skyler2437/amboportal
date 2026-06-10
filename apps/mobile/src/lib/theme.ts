import { MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Brand blue — matches the app icon and web --brand (#005EFF)
    primary: '#005EFF',
    primaryContainer: '#EBF2FF',
    secondary: '#6366f1',
    secondaryContainer: '#eef2ff',
    error: '#ef4444',
    errorContainer: '#fef2f2',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    onSurface: '#1a1d23',
    onSurfaceVariant: '#5f6877',
    outline: '#e2e5ea',
  },
};

export const statusColors = {
  Approved: { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' },
  Pending: { bg: '#fffbeb', text: '#f59e0b', border: '#fde68a' },
  Denied: { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' },
} as const;

export const roleColors = {
  admin: { bg: '#EBF2FF', text: '#005EFF' },
  superadmin: { bg: '#f5f3ff', text: '#7c3aed' },
  student: { bg: '#f0fdf4', text: '#22c55e' },
  basic: { bg: '#f5f5f5', text: '#6b7280' },
  applicant: { bg: '#fefce8', text: '#ca8a04' },
} as const;
