import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { ThemeTokens } from '@/charts/types';
import { useUIStore } from '@/stores/ui-store';
import { darkTokens, lightTokens } from './tokens';

const ThemeContext = createContext<ThemeTokens>(darkTokens);

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  );
}
