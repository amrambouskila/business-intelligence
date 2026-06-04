import { describe, it, expect } from 'vitest';
import { isPositiveLabel } from '@/data/stats/isPositiveLabel';

describe('isPositiveLabel', () => {
  it('treats numeric 1 and boolean true as positive', () => {
    expect(isPositiveLabel(1)).toBe(true);
    expect(isPositiveLabel(true)).toBe(true);
  });

  it('treats "1"/"true" strings as positive, case- and whitespace-insensitive', () => {
    expect(isPositiveLabel('1')).toBe(true);
    expect(isPositiveLabel('true')).toBe(true);
    expect(isPositiveLabel('TRUE')).toBe(true);
    expect(isPositiveLabel(' True ')).toBe(true);
  });

  it('treats everything else as negative', () => {
    expect(isPositiveLabel(0)).toBe(false);
    expect(isPositiveLabel(2)).toBe(false);
    expect(isPositiveLabel(false)).toBe(false);
    expect(isPositiveLabel('false')).toBe(false);
    expect(isPositiveLabel('0')).toBe(false);
    expect(isPositiveLabel('spam')).toBe(false);
    expect(isPositiveLabel(null)).toBe(false);
    expect(isPositiveLabel(undefined)).toBe(false);
  });
});
