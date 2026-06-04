import { describe, it, expect } from 'vitest';
import { qqPoints } from '@/data/stats/qqPoints';
import { normalQuantile } from '@/data/stats/normalQuantile';

describe('qqPoints', () => {
  it('returns [] for empty input', () => {
    expect(qqPoints([])).toEqual([]);
  });

  it('returns [] when every value is non-finite', () => {
    expect(qqPoints([NaN, Infinity, -Infinity])).toEqual([]);
  });

  it('pairs sorted samples with theoretical quantiles at p=(i+0.5)/n', () => {
    const pts = qqPoints([0, 1, 2, 3]);
    expect(pts.map((pt) => pt.sample)).toEqual([0, 1, 2, 3]);
    // n=4 → first plotting position p = 0.5/4 = 0.125.
    expect(pts[0].theoretical).toBeCloseTo(normalQuantile(0.125), 3);
    expect(pts[0].theoretical).toBeCloseTo(-1.1503, 3);
  });

  it('produces strictly increasing theoretical quantiles', () => {
    const pts = qqPoints([10, 20, 30, 40, 50]);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].theoretical).toBeGreaterThan(pts[i - 1].theoretical);
    }
  });

  it('sorts unsorted input ascending before pairing', () => {
    expect(qqPoints([3, 0, 2, 1])).toEqual(qqPoints([0, 1, 2, 3]));
  });

  it('drops non-finite values before computing', () => {
    expect(qqPoints([0, 1, NaN, 2, Infinity, 3])).toEqual(qqPoints([0, 1, 2, 3]));
  });

  it('keeps every theoretical quantile finite (plotting positions inside (0,1))', () => {
    const pts = qqPoints([5, 6, 7]);
    for (const pt of pts) {
      expect(Number.isFinite(pt.theoretical)).toBe(true);
    }
  });
});
