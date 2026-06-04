import { describe, it, expect } from 'vitest';
import { calibrationCurve } from '@/data/stats/calibrationCurve';

describe('calibrationCurve', () => {
  it('bins predicted probabilities and compares to observed frequency (reference case)', () => {
    // scores [0.1,0.2] → bin 0; scores [0.8,0.9] → bin 1. labels [0,0,1,1].
    const result = calibrationCurve([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1], 2);
    expect(result).toHaveLength(2);

    expect(result[0].meanPredicted).toBeCloseTo(0.15, 10);
    expect(result[0].observedRate).toBe(0);
    expect(result[0].count).toBe(2);

    expect(result[1].meanPredicted).toBeCloseTo(0.85, 10);
    expect(result[1].observedRate).toBe(1);
    expect(result[1].count).toBe(2);
  });

  it('places score===1 in the last bin (no out-of-range index)', () => {
    const result = calibrationCurve([1], [1], 4);
    expect(result).toHaveLength(1);
    expect(result[0].meanPredicted).toBe(1);
    expect(result[0].observedRate).toBe(1);
    expect(result[0].count).toBe(1);
  });

  it('drops scores outside [0,1] and non-finite scores', () => {
    // 1.5 and -0.2 are out of range; NaN/Infinity are non-finite; only 0.3 and 0.7 survive.
    const result = calibrationCurve(
      [1.5, -0.2, NaN, Infinity, -Infinity, 0.3, 0.7],
      [1, 1, 1, 1, 1, 0, 1],
      2,
    );
    expect(result).toHaveLength(2);
    expect(result[0].meanPredicted).toBeCloseTo(0.3, 10);
    expect(result[0].observedRate).toBe(0);
    expect(result[0].count).toBe(1);
    expect(result[1].meanPredicted).toBeCloseTo(0.7, 10);
    expect(result[1].observedRate).toBe(1);
    expect(result[1].count).toBe(1);
  });

  it('drops empty bins and returns surviving bins in ascending order', () => {
    // 4 bins over [0,1): edges at 0.25/0.5/0.75. 0.1→bin0, 0.8/0.9→bin3. bins 1,2 empty.
    const result = calibrationCurve([0.1, 0.8, 0.9], [0, 1, 0], 4);
    expect(result).toHaveLength(2);
    expect(result[0].meanPredicted).toBeCloseTo(0.1, 10);
    expect(result[0].count).toBe(1);
    expect(result[1].meanPredicted).toBeCloseTo(0.85, 10);
    expect(result[1].observedRate).toBeCloseTo(0.5, 10);
    expect(result[1].count).toBe(2);
  });

  it('treats bins < 1 as a single bin spanning [0,1]', () => {
    const result = calibrationCurve([0.2, 0.4, 0.6, 0.8], [0, 1, 0, 1], 0);
    expect(result).toHaveLength(1);
    expect(result[0].meanPredicted).toBeCloseTo(0.5, 10);
    expect(result[0].observedRate).toBeCloseTo(0.5, 10);
    expect(result[0].count).toBe(4);
  });

  it('floors a fractional bin count', () => {
    // bins=2.9 → 2 bins. 0.1→bin0, 0.6→bin1.
    const result = calibrationCurve([0.1, 0.6], [1, 0], 2.9);
    expect(result).toHaveLength(2);
    expect(result[0].meanPredicted).toBeCloseTo(0.1, 10);
    expect(result[1].meanPredicted).toBeCloseTo(0.6, 10);
  });

  it('recognizes boolean and string positive labels', () => {
    // All four land in the single bin; true / 'true' / '1' are positive, 'false' is not → 3/4.
    const result = calibrationCurve([0.5, 0.5, 0.5, 0.5], [true, 'true', '1', 'false'], 1);
    expect(result).toHaveLength(1);
    expect(result[0].observedRate).toBeCloseTo(0.75, 10);
    expect(result[0].count).toBe(4);
  });

  it('treats string labels case-insensitively with surrounding whitespace', () => {
    const result = calibrationCurve([0.5, 0.5], [' TRUE ', '  1 '], 1);
    expect(result[0].observedRate).toBe(1);
    expect(result[0].count).toBe(2);
  });

  it('counts unrecognized label types as negative', () => {
    // null, undefined, object, and a non-1 number are all non-positive.
    const result = calibrationCurve([0.5, 0.5, 0.5, 0.5], [null, undefined, {}, 2], 1);
    expect(result[0].observedRate).toBe(0);
    expect(result[0].count).toBe(4);
  });

  it('returns [] when every score is dropped', () => {
    expect(calibrationCurve([1.2, -3, NaN], [1, 1, 1], 3)).toEqual([]);
  });

  it('returns [] for empty input', () => {
    expect(calibrationCurve([], [], 5)).toEqual([]);
  });

  it('ignores scores without a matching label (uses min length)', () => {
    // 3 scores but 1 label → only the first pair is considered.
    const result = calibrationCurve([0.2, 0.8, 0.9], [1], 2);
    expect(result).toHaveLength(1);
    expect(result[0].meanPredicted).toBeCloseTo(0.2, 10);
    expect(result[0].observedRate).toBe(1);
    expect(result[0].count).toBe(1);
  });

  it('places score===0 in the first bin', () => {
    const result = calibrationCurve([0], [1], 4);
    expect(result).toHaveLength(1);
    expect(result[0].meanPredicted).toBe(0);
    expect(result[0].observedRate).toBe(1);
  });
});
