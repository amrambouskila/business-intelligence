import { createContext, useContext } from 'react';
import type { ThemeTokens } from '@/charts/types';
import { darkTokens } from './tokens';

export const ThemeContext = createContext<ThemeTokens>(darkTokens);

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext);
}
