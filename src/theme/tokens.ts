import type { ThemeTokens } from '@/charts/types';

export const darkTokens: ThemeTokens = {
  mode: 'dark',
  background: '#0f1117',
  foreground: '#e4e4e7',
  gridColor: '#27272a',
  axisColor: '#71717a',
  colorScale: [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  ],
  sequentialScale: ['#1e3a5f', '#3b82f6'],
  divergingScale: ['#ef4444', '#fafafa', '#3b82f6'],
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: { small: 10, medium: 12, large: 14 },
};

export const lightTokens: ThemeTokens = {
  mode: 'light',
  background: '#ffffff',
  foreground: '#18181b',
  gridColor: '#e4e4e7',
  axisColor: '#71717a',
  colorScale: [
    '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
    '#db2777', '#0891b2', '#ea580c', '#0d9488', '#9333ea',
  ],
  sequentialScale: ['#dbeafe', '#1d4ed8'],
  divergingScale: ['#dc2626', '#fafafa', '#2563eb'],
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: { small: 10, medium: 12, large: 14 },
};
