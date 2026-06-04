import { describe, it, expect } from 'vitest';
import { rocCurve } from '@/data/stats/rocCurve';

describe('rocCurve', () => {
  it('scores a perfect separator at auc === 1', () => {
    // Positives outrank every negative → curve climbs to tpr=1 before fpr leaves 0.
    const result = rocCurve([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]);
    expect(result.auc).toBeCloseTo(1, 10);
    expect(result.points[0]).toEqual({ fpr: 0, tpr: 0, threshold: Infinity });
    expect(result.points[result.points.length - 1]).toEqual({ fpr: 1, tpr: 1, threshold: 0.6 });
  });

  it('scores an interleaved ranking at auc === 0.75 (trapezoidal reference)', () => {
    // desc order: 0.8(P),0.7(N),0.6(P),0.5(N) → steps (0,.5)(.5,.5)(.5,1)(1,1).
    // AUC = 0.5·0.5 + 0.5·1 = 0.25 + 0.5 = 0.75.
    const result = rocCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    expect(result.auc).toBeCloseTo(0.75, 10);
  });

  it('emits points from (0,0) to (1,1)', () => {
    const result = rocCurve([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]);
    const first = result.points[0];
    const last = result.points[result.points.length - 1];
    expect(first.fpr).toBe(0);
    expect(first.tpr).toBe(0);
    expect(last.fpr).toBe(1);
    expect(last.tpr).toBe(1);
  });

  it('returns the diagonal with auc 0.5 when there are no positives', () => {
    const result = rocCurve([0.9, 0.8, 0.7, 0.6], [0, 0, 0, 0]);
    expect(result.auc).toBe(0.5);
    expect(result.points).toEqual([
      { fpr: 0, tpr: 0, threshold: Infinity },
      { fpr: 1, tpr: 1, threshold: -Infinity },
    ]);
  });

  it('returns the diagonal with auc 0.5 when there are no negatives', () => {
    const result = rocCurve([0.9, 0.8, 0.7, 0.6], [1, 1, 1, 1]);
    expect(result.auc).toBe(0.5);
    expect(result.points).toEqual([
      { fpr: 0, tpr: 0, threshold: Infinity },
      { fpr: 1, tpr: 1, threshold: -Infinity },
    ]);
  });

  it('treats true, "1", and "true" as positive labels', () => {
    // Mixed positive encodings ranked above the negatives → still a perfect separator.
    const result = rocCurve([0.9, 0.8, 0.7, 0.6], [true, '1', 0, false]);
    expect(result.auc).toBeCloseTo(1, 10);
  });

  it('treats anything else as a negative label', () => {
    // '0', null, undefined, and 2 are all negative; only the two 1s are positive.
    const result = rocCurve([0.9, 0.8, 0.7, 0.6], [1, '0', null, 1]);
    expect(result.auc).toBeCloseTo(0.5, 10);
  });

  it('drops pairs whose score is non-finite before scoring', () => {
    const withNoise = rocCurve([0.9, NaN, 0.8, Infinity, 0.7, 0.6], [1, 0, 1, 1, 0, 0]);
    const clean = rocCurve([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]);
    expect(withNoise).toEqual(clean);
  });

  it('iterates over the shorter of scores and labels', () => {
    // Extra labels beyond the score length are ignored.
    const result = rocCurve([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0, 1, 1, 1]);
    expect(result.auc).toBeCloseTo(1, 10);
  });

  it('is invariant to the input order of the pairs', () => {
    const ordered = rocCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    const shuffled = rocCurve([0.5, 0.8, 0.6, 0.7], [0, 1, 1, 0]);
    expect(shuffled.auc).toBeCloseTo(ordered.auc, 10);
  });

  it('uses +Infinity as the threshold of the leading origin point', () => {
    const result = rocCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    expect(result.points[0].threshold).toBe(Infinity);
  });

  it('collapses tied scores into one threshold step (all-equal scores → chance line, auc 0.5)', () => {
    // Zero discriminative power: every score identical. Order must not matter.
    expect(rocCurve([0.5, 0.5, 0.5, 0.5], [1, 1, 0, 0]).auc).toBeCloseTo(0.5, 10);
    expect(rocCurve([0.5, 0.5, 0.5, 0.5], [0, 0, 1, 1]).auc).toBeCloseTo(0.5, 10);
  });

  it('is order-invariant for a single tied positive vs tied negative (auc 0.5, not 0/1)', () => {
    expect(rocCurve([0.5, 0.5], [1, 0]).auc).toBeCloseTo(0.5, 10);
    expect(rocCurve([0.5, 0.5], [0, 1]).auc).toBeCloseTo(0.5, 10);
  });

  it('produces fpr values in non-decreasing order for trapezoidal integration', () => {
    const result = rocCurve([0.8, 0.7, 0.6, 0.5], [1, 0, 1, 0]);
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].fpr).toBeGreaterThanOrEqual(result.points[i - 1].fpr);
    }
  });
});
