import { useEffect, type ReactNode } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { darkTokens, lightTokens } from './tokens';
import { ThemeContext } from './theme-context';

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
