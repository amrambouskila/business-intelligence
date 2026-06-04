import { describe, it, expect } from 'vitest';
import { autocorrelation } from '@/data/stats/autocorrelation';

describe('autocorrelation', () => {
  it('computes reference autocorrelation values by lag', () => {
    expect(autocorrelation([1, 2, 3, 4], 3)).toEqual([
      { lag: 1, value: 0.25 },
      { lag: 2, value: -0.3 },
      { lag: 3, value: -0.45 },
    ]);
  });

  it('filters non-finite values and clamps requested lags', () => {
    expect(autocorrelation([1, NaN, 'x', 2, 3], 99)).toEqual([
      { lag: 1, value: 0 },
      { lag: 2, value: -0.5 },
    ]);
  });

  it('returns an empty series for too few or constant finite values', () => {
    expect(autocorrelation([1], 3)).toEqual([]);
    expect(autocorrelation([4, 4, 4], 2)).toEqual([]);
    expect(autocorrelation([1, 2, 3], -1)).toEqual([]);
  });
});
