import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { darkTokens, lightTokens } from './tokens';
import { ThemeContext } from './theme-context';

const THEME_STORAGE_KEY = 'bi-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  useLayoutEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') setTheme(stored);
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  );
}
