import { describe, it, expect } from 'vitest';
import { formatNumber } from '@/lib/formatNumber';

describe('formatNumber', () => {
  it('defaults to 2 fractional digits', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57');
  });

  it('respects an explicit decimals arg', () => {
    expect(formatNumber(1234.567, 0)).toBe('1,235');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
  });
});
