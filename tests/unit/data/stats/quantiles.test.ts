import { describe, it, expect } from 'vitest';
import { quantiles } from '@/data/stats/quantiles';

describe('quantiles', () => {
  it('computes the five-number summary for a 9-element odd-length series', () => {
    const result = quantiles([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.min).toBe(1);
    expect(result.q1).toBeCloseTo(3, 10);
    expect(result.median).toBeCloseTo(5, 10);
    expect(result.q3).toBeCloseTo(7, 10);
    expect(result.max).toBe(9);
  });

  it('interpolates quartiles for an even-length series (PERCENTILE.INC)', () => {
    const result = quantiles([1, 2, 3, 4]);
    expect(result.min).toBe(1);
    expect(result.q1).toBeCloseTo(1.75, 10);
    expect(result.median).toBeCloseTo(2.5, 10);
    expect(result.q3).toBeCloseTo(3.25, 10);
    expect(result.max).toBe(4);
  });

  it('returns the lone value for every quantile on a single-element series', () => {
    const result = quantiles([5]);
    expect(result.min).toBe(5);
    expect(result.q1).toBe(5);
    expect(result.median).toBe(5);
    expect(result.q3).toBe(5);
    expect(result.max).toBe(5);
  });

  it('filters non-finite values before computing', () => {
    expect(quantiles([1, 2, NaN, 3, 4])).toEqual(quantiles([1, 2, 3, 4]));
  });

  it('sorts unsorted input ascending before computing', () => {
    expect(quantiles([9, 1, 5, 3, 7, 2, 8, 4, 6])).toEqual(quantiles([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  });

  it('returns an all-zero summary for an empty series', () => {
    expect(quantiles([])).toEqual({ min: 0, q1: 0, median: 0, q3: 0, max: 0 });
  });

  it('returns an all-zero summary when every value is non-finite', () => {
    expect(quantiles([NaN, Infinity, -Infinity])).toEqual({ min: 0, q1: 0, median: 0, q3: 0, max: 0 });
  });
});
