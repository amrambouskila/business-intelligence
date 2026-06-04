import { describe, it, expect } from 'vitest';
import { prCurve } from '@/data/stats/prCurve';

describe('prCurve', () => {
  it('gives AP = 1 when all positives outrank all negatives', () => {
    const result = prCurve([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]);
    expect(result.ap).toBeCloseTo(1, 10);
  });

  it('matches the reference AP for an interleaved ranking ((1 + 2/3)/2)', () => {
    // ranks: pos(p=1), neg, pos(p=2/3), neg; P=2 → ap = (1 + 2/3)/2 = 0.8333333
    const result = prCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    expect(result.ap).toBeCloseTo(0.8333333, 6);
  });

  it('emits one point per rank with precision/recall accumulating down the ranking', () => {
    const result = prCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    expect(result.points).toHaveLength(4);
    expect(result.points).toEqual([
      { recall: 0.5, precision: 1, threshold: 0.8 },
      { recall: 0.5, precision: 0.5, threshold: 0.7 },
      { recall: 1, precision: 2 / 3, threshold: 0.6 },
      { recall: 1, precision: 0.5, threshold: 0.5 },
    ]);
  });

  it('returns empty points and AP 0 when there are no positives', () => {
    const result = prCurve([0.9, 0.5, 0.1], [0, 0, 0]);
    expect(result.points).toEqual([]);
    expect(result.ap).toBe(0);
  });

  it('treats 1, true, "1", and "true" (any case, trimmed) as positive labels', () => {
    const result = prCurve([0.9, 0.8, 0.7, 0.6], [1, true, ' True ', '1']);
    // All four are positive and ranked first → AP = 1, recall reaches 1.
    expect(result.ap).toBeCloseTo(1, 10);
    expect(result.points[result.points.length - 1].recall).toBeCloseTo(1, 10);
  });

  it('treats other label values (0, false, "no", null, undefined) as negative', () => {
    const result = prCurve([0.9, 0.8, 0.7, 0.6, 0.5], [1, 0, false, null, undefined]);
    // Only the first item is positive → P=1, AP = precision@1 = 1.
    expect(result.ap).toBeCloseTo(1, 10);
    expect(result.points[0]).toEqual({ recall: 1, precision: 1, threshold: 0.9 });
  });

  it('drops pairs with non-finite scores before ranking', () => {
    const withNonFinite = prCurve([0.8, NaN, 0.7, Infinity, 0.6, 0.5], [1, 1, 0, 1, 1, 0]);
    const clean = prCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    expect(withNonFinite).toEqual(clean);
  });

  it('sorts by score descending regardless of input order', () => {
    const unordered = prCurve([0.5, 0.8, 0.6, 0.7], [0, 1, 1, 0]);
    const ordered = prCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    expect(unordered).toEqual(ordered);
  });

  it('is order-invariant under tied scores (recall-delta AP, not per-rank precision sum)', () => {
    // One tied positive + one tied negative at the same score: at the single
    // grouped threshold precision = 0.5 at recall 1, so AP = 0.5 either order.
    expect(prCurve([0.5, 0.5], [1, 0]).ap).toBeCloseTo(0.5, 10);
    expect(prCurve([0.5, 0.5], [0, 1]).ap).toBeCloseTo(0.5, 10);
  });

  it('emits one collapsed point per distinct tied score', () => {
    const result = prCurve([0.5, 0.5], [1, 0]);
    expect(result.points).toEqual([{ recall: 1, precision: 0.5, threshold: 0.5 }]);
  });

  it('returns AP 0 and no points when every score is non-finite', () => {
    const result = prCurve([NaN, Infinity, -Infinity], [1, 1, 0]);
    expect(result.points).toEqual([]);
    expect(result.ap).toBe(0);
  });
});
