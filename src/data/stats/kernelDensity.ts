/** Gaussian kernel density estimation over a 1-D sample. */

export interface KernelDensityOptions {
  /** Smoothing bandwidth h. Must be > 0; otherwise the Silverman rule is used. */
  bandwidth?: number;
  /** Number of evenly spaced points on the output x-grid. Defaults to 50. */
  steps?: number;
}

export interface DensityPoint {
  x: number;
  y: number;
}

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

/** Standard normal pdf φ(z) = (1/√(2π))·exp(−z²/2). */
function standardNormalPdf(z: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * z * z);
}

/**
 * Sample standard deviation σ̂ (÷(n−1), the unbiased estimator) of a finite
 * sample; 0 for n < 2. This matches the σ̂ used by the canonical Silverman/Scott
 * normal-reference rule and reference tools (R bw.nrd, scipy/statsmodels).
 */
function sampleStd(values: number[]): number {
  const n = values.length;
  if (n < 2) {
    return 0;
  }
  const mean = values.reduce((acc, v) => acc + v, 0) / n;
  const variance = values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (n - 1);
  return Math.sqrt(variance);
}

/**
 * Silverman's rule of thumb: h = 1.06·σ̂·n^(−1/5) with the SAMPLE sd σ̂.
 * Falls back to h = 1 when σ̂ === 0 or n < 2 (degenerate spread).
 */
function silvermanBandwidth(values: number[]): number {
  const n = values.length;
  const sigma = sampleStd(values);
  if (sigma === 0 || n < 2) {
    return 1;
  }
  return 1.06 * sigma * Math.pow(n, -1 / 5);
}

/**
 * Gaussian KDE. Returns `steps` density points over [min(values), max(values)].
 *
 * density(x) = (1/(n·h))·Σᵢ φ((x − xᵢ)/h)
 *
 * Bandwidth h is `opts.bandwidth` when given and > 0, else Silverman's rule.
 * Non-finite inputs are dropped. Returns [] for empty input. When `steps === 1`
 * or the sample is constant (max === min) a single point at `min` is emitted.
 */
export function kernelDensity(values: number[], opts: KernelDensityOptions = {}): DensityPoint[] {
  const finite = values.filter((v): v is number => Number.isFinite(v));
  const n = finite.length;
  if (n === 0) {
    return [];
  }

  const h =
    opts.bandwidth !== undefined && opts.bandwidth > 0
      ? opts.bandwidth
      : silvermanBandwidth(finite);

  const steps = opts.steps ?? 50;

  const min = finite.reduce((a, b) => (a < b ? a : b), Infinity);
  const max = finite.reduce((a, b) => (a > b ? a : b), -Infinity);

  const density = (x: number): number => {
    let sum = 0;
    for (const xi of finite) {
      sum += standardNormalPdf((x - xi) / h);
    }
    return sum / (n * h);
  };

  if (steps === 1 || max === min) {
    return [{ x: min, y: density(min) }];
  }

  const span = max - min;
  const points: DensityPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const x = min + (span * i) / (steps - 1);
    points.push({ x, y: density(x) });
  }
  return points;
}
