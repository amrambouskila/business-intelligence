import { describe, it, expect } from 'vitest';
import { partialAutocorrelation } from '@/data/stats/partialAutocorrelation';

describe('partialAutocorrelation', () => {
  it('computes Durbin-Levinson partial autocorrelation values by lag', () => {
    expect(partialAutocorrelation([1, 2, 3, 4], 3)).toEqual([
      { lag: 1, value: 0.25 },
      { lag: 2, value: -0.38666666666666666 },
      { lag: 3, value: -0.31270903010033446 },
    ]);
  });

  it('filters invalid input through autocorrelation and returns empty for degenerate series', () => {
    expect(partialAutocorrelation([1, NaN, 'x', 2, 3], 99)).toEqual([
      { lag: 1, value: 0 },
      { lag: 2, value: -0.5 },
    ]);
    expect(partialAutocorrelation([4, 4, 4], 3)).toEqual([]);
    expect(partialAutocorrelation([1], 3)).toEqual([]);
  });
});
