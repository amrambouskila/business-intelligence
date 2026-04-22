import { describe, it, expect } from 'vitest';
import { formatBytes, formatNumber } from '@/lib/color';

describe('formatBytes', () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes under 1KB', () => {
    expect(formatBytes(512)).toBe('512.0 B');
  });

  it('formats KB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats MB', () => {
    expect(formatBytes(1024 * 1024 * 3)).toBe('3.0 MB');
  });

  it('formats GB', () => {
    expect(formatBytes(1024 ** 3 * 2)).toBe('2.0 GB');
  });
});

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
