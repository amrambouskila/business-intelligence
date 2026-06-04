import { describe, it, expect } from 'vitest';
import { normalQuantile } from '@/data/stats/normalQuantile';

describe('normalQuantile', () => {
  it('returns 0 at the median p=0.5', () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 6);
  });

  it('matches the 97.5th percentile z ≈ 1.959964', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);
  });

  it('matches the 2.5th percentile z ≈ -1.959964 (symmetry)', () => {
    expect(normalQuantile(0.025)).toBeCloseTo(-1.959964, 5);
  });

  it('recovers z=1 from Φ(1) ≈ 0.8413447 (central region)', () => {
    expect(normalQuantile(0.8413447)).toBeCloseTo(1.0, 3);
  });

  it('recovers z=-1 from Φ(-1) ≈ 0.1586553 (central region)', () => {
    expect(normalQuantile(0.1586553)).toBeCloseTo(-1.0, 3);
  });

  it('uses the upper-tail region beyond p=0.97575 and stays monotone', () => {
    // p=0.999 → z ≈ 3.090232 (reference value).
    expect(normalQuantile(0.999)).toBeCloseTo(3.090232, 4);
  });

  it('uses the lower-tail region below p=0.02425 and stays monotone', () => {
    // p=0.001 → z ≈ -3.090232 (reference value, symmetry).
    expect(normalQuantile(0.001)).toBeCloseTo(-3.090232, 4);
  });

  it('returns -Infinity for p <= 0', () => {
    expect(normalQuantile(0)).toBe(-Infinity);
    expect(normalQuantile(-0.5)).toBe(-Infinity);
  });

  it('returns +Infinity for p >= 1', () => {
    expect(normalQuantile(1)).toBe(Infinity);
    expect(normalQuantile(1.5)).toBe(Infinity);
  });
});
