import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/lib/formatBytes';

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
