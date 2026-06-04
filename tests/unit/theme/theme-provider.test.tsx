import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/theme/theme-provider';
import { useTheme } from '@/theme/theme-context';
import { useUIStore } from '@/stores/ui-store';

function Inner() {
  const theme = useTheme();
  return <span data-testid="mode">{theme.mode}</span>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'dark', sidebarOpen: true, sidebarTab: 'data', modal: 'none' });
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.clear();
  });

  it('supplies dark tokens and sets data-theme="dark" on <html>', () => {
    render(<ThemeProvider><Inner /></ThemeProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('supplies light tokens when ui-store is set to light', () => {
    useUIStore.setState({ theme: 'light', sidebarOpen: true, sidebarTab: 'data', modal: 'none' });
    render(<ThemeProvider><Inner /></ThemeProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('hydrates the stored theme and persists later changes', () => {
    window.localStorage.setItem('bi-theme', 'light');
    render(<ThemeProvider><Inner /></ThemeProvider>);
    expect(useUIStore.getState().theme).toBe('light');
    expect(window.localStorage.getItem('bi-theme')).toBe('light');
  });

  it('ignores an invalid stored theme', () => {
    window.localStorage.setItem('bi-theme', 'blue');
    render(<ThemeProvider><Inner /></ThemeProvider>);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(window.localStorage.getItem('bi-theme')).toBe('dark');
  });
});
