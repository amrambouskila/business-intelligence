import { describe, it, expect } from 'vitest';
import { normalCdf } from '@/data/stats/normalCdf';

describe('normalCdf', () => {
  it('returns standard normal CDF reference values within approximation tolerance', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it('handles infinities and non-finite inputs explicitly', () => {
    expect(normalCdf(-Infinity)).toBe(0);
    expect(normalCdf(Infinity)).toBe(1);
    expect(Number.isNaN(normalCdf(Number.NaN))).toBe(true);
  });
});
