import { describe, it, expect } from 'vitest';
import { darkTokens, lightTokens } from '@/theme/tokens';

describe('theme tokens', () => {
  it('dark tokens declare mode="dark" with a full color scale', () => {
    expect(darkTokens.mode).toBe('dark');
    expect(darkTokens.colorScale.length).toBe(10);
    expect(darkTokens.divergingScale.length).toBe(3);
    expect(darkTokens.sequentialScale.length).toBe(2);
  });

  it('light tokens declare mode="light" with a full color scale', () => {
    expect(lightTokens.mode).toBe('light');
    expect(lightTokens.colorScale.length).toBe(10);
  });

  it('font sizes escalate small < medium < large', () => {
    for (const tokens of [darkTokens, lightTokens]) {
      expect(tokens.fontSize.small).toBeLessThan(tokens.fontSize.medium);
      expect(tokens.fontSize.medium).toBeLessThan(tokens.fontSize.large);
    }
  });
});
