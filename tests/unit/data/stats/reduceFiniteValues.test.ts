import { describe, it, expect } from 'vitest';
import { reduceFiniteValues } from '@/data/stats/reduceFiniteValues';

describe('reduceFiniteValues', () => {
  it('returns 0 for an empty array regardless of op', () => {
    expect(reduceFiniteValues([], 'sum')).toBe(0);
    expect(reduceFiniteValues([], 'mean')).toBe(0);
    expect(reduceFiniteValues([], 'min')).toBe(0);
    expect(reduceFiniteValues([], 'max')).toBe(0);
    expect(reduceFiniteValues([], 'median')).toBe(0);
  });

  it('computes sum, mean, min, max', () => {
    expect(reduceFiniteValues([1, 2, 3, 4], 'sum')).toBe(10);
    expect(reduceFiniteValues([1, 2, 3, 4], 'mean')).toBe(2.5);
    expect(reduceFiniteValues([3, 1, 2], 'min')).toBe(1);
    expect(reduceFiniteValues([3, 1, 2], 'max')).toBe(3);
  });

  it('computes the median for odd and even lengths without mutating input', () => {
    const odd = [5, 1, 3];
    expect(reduceFiniteValues(odd, 'median')).toBe(3);
    expect(odd).toEqual([5, 1, 3]);
    expect(reduceFiniteValues([1, 4], 'median')).toBe(2.5);
  });
});
