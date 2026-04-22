import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme, ThemeContext } from '@/theme/theme-context';
import { darkTokens, lightTokens } from '@/theme/tokens';

describe('useTheme', () => {
  it('returns the dark tokens by default (no provider)', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe(darkTokens);
  });

  it('returns whatever tokens the nearest provider supplies', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeContext.Provider value={lightTokens}>{children}</ThemeContext.Provider>
      ),
    });
    expect(result.current).toBe(lightTokens);
  });
});
