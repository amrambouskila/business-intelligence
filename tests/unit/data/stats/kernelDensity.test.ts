import { describe, it, expect } from 'vitest';
import { kernelDensity } from '@/data/stats/kernelDensity';

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
const PHI_0 = INV_SQRT_2PI; // φ(0) ≈ 0.3989422804
const PHI_1 = INV_SQRT_2PI * Math.exp(-0.5); // φ(1) ≈ 0.2419707245

describe('kernelDensity', () => {
  it('returns [] for empty input', () => {
    expect(kernelDensity([], {})).toEqual([]);
  });

  it('drops non-finite values and still returns [] when none remain', () => {
    expect(kernelDensity([NaN, Infinity, -Infinity], {})).toEqual([]);
  });

  it('matches the reference density for a symmetric two-point sample (bandwidth given)', () => {
    // bandwidth=1, steps=3 → x-grid = [-1, 0, 1]
    // density(0) = (1/(2·1))·(φ((0−(−1))/1) + φ((0−1)/1)) = (1/2)·(φ(1)+φ(1)) = φ(1)
    const pts = kernelDensity([-1, 1], { bandwidth: 1, steps: 3 });
    expect(pts).toHaveLength(3);
    expect(pts[0].x).toBe(-1);
    expect(pts[2].x).toBe(1);
    expect(pts[1].x).toBe(0);
    expect(pts[1].y).toBeCloseTo(PHI_1, 5);
    expect(pts[1].y).toBeCloseTo(0.241971, 5);
  });

  it('reduces to φ(0) at a single grid point over a single observation (steps===1 branch)', () => {
    // steps=1 → single point at min; density(0) = (1/(1·1))·φ(0) = φ(0)
    const pts = kernelDensity([0], { bandwidth: 1, steps: 1 });
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBe(0);
    expect(pts[0].y).toBeCloseTo(PHI_0, 5);
    expect(pts[0].y).toBeCloseTo(0.398942, 5);
  });

  it('emits a single point at min when the sample is constant (max===min branch)', () => {
    // Two identical observations, default steps. max === min → one point at min.
    // density(2) = (1/(n·h))·Σ φ(0) = (1/(2·h))·(2·φ(0)) = φ(0)/h, h=1 (σ===0 fallback)
    const pts = kernelDensity([2, 2], { bandwidth: 1 });
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBe(2);
    expect(pts[0].y).toBeCloseTo(PHI_0, 5);
  });

  it('falls back to h=1 when σ===0 (constant sample) so the peak is φ(0)', () => {
    // No bandwidth given → Silverman, but σ===0 → h=1.
    const pts = kernelDensity([5, 5, 5], {});
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBe(5);
    // density(5) = (1/(3·1))·(3·φ(0)) = φ(0)
    expect(pts[0].y).toBeCloseTo(PHI_0, 5);
  });

  it('falls back to h=1 for a single observation (n<2) under the default bandwidth', () => {
    // n<2 → silverman returns 1; single point (max===min) → density(7) = φ(0)/1
    const pts = kernelDensity([7], {});
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBe(7);
    expect(pts[0].y).toBeCloseTo(PHI_0, 5);
  });

  it('uses Silverman bandwidth h = 1.06·σ̂·n^(−1/5) with the SAMPLE sd when no bandwidth is given', () => {
    // Reference: [0,2] → σ̂ (sample sd, ÷(n−1)) = √2, n = 2 → h = 1.06·√2·2^(−1/5).
    const values = [0, 2];
    const h = 1.06 * Math.SQRT2 * Math.pow(2, -1 / 5); // ≈ 1.30498
    const pts = kernelDensity(values, { steps: 3 });
    // Reproduce density at the midpoint x=1 using the documented h.
    const phi = (z: number): number => INV_SQRT_2PI * Math.exp(-0.5 * z * z);
    const expectedMid = (phi((1 - 0) / h) + phi((1 - 2) / h)) / (2 * h);
    expect(pts).toHaveLength(3);
    expect(pts[1].x).toBe(1);
    expect(pts[1].y).toBeCloseTo(expectedMid, 5);
  });

  it('respects a caller-supplied bandwidth over the Silverman default (bandwidth-given branch)', () => {
    const values = [0, 2];
    const h = 0.5; // far from the Silverman value, so the branch is observable
    const phi = (z: number): number => INV_SQRT_2PI * Math.exp(-0.5 * z * z);
    const expectedMid = (phi((1 - 0) / h) + phi((1 - 2) / h)) / (2 * h);
    const pts = kernelDensity(values, { bandwidth: h, steps: 3 });
    expect(pts[1].y).toBeCloseTo(expectedMid, 5);
  });

  it('ignores a non-positive bandwidth and uses Silverman instead', () => {
    const values = [0, 2];
    const hSilverman = 1.06 * Math.SQRT2 * Math.pow(2, -1 / 5);
    const phi = (z: number): number => INV_SQRT_2PI * Math.exp(-0.5 * z * z);
    const expectedMid = (phi((1 - 0) / hSilverman) + phi((1 - 2) / hSilverman)) / (2 * hSilverman);
    const pts = kernelDensity(values, { bandwidth: 0, steps: 3 });
    expect(pts[1].y).toBeCloseTo(expectedMid, 5);
  });

  it('derives the grid min/max regardless of input order', () => {
    // Unordered input: the x-grid still spans [min, max] = [1, 3].
    const pts = kernelDensity([2, 1, 3], { bandwidth: 1, steps: 3 });
    expect(pts[0].x).toBe(1);
    expect(pts[2].x).toBe(3);
  });

  it('produces a valid pdf — Riemann integral ≈ 1 over the data range for a spread sample', () => {
    // A wide, evenly spread sample with a SMALL bandwidth keeps the kernels narrow
    // relative to the range, so the mass escaping [min,max] (only the edge kernels'
    // outer tails) is ~1% and the curve over [min,max] integrates to ≈ 1 by the
    // left-Riemann rule. (With the default Silverman h ≈ 10 here, far more tail mass
    // would fall outside [min,max] — the density genuinely extends beyond the data.)
    const values: number[] = [];
    for (let i = 0; i < 200; i++) {
      values.push(i * 0.5); // 0, 0.5, ..., 99.5
    }
    const steps = 500;
    const pts = kernelDensity(values, { steps, bandwidth: 1 });
    const dx = (pts[pts.length - 1].x - pts[0].x) / (steps - 1);
    const area = pts.reduce((acc, p) => acc + p.y * dx, 0);
    expect(area).toBeCloseTo(1, 1); // within 0.05
    expect(Math.abs(area - 1)).toBeLessThan(0.05);
  });
});
