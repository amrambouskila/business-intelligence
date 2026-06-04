/** Standard-normal cumulative distribution function via Abramowitz-Stegun erf approximation. */

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x: number): number {
  if (x === -Infinity) return 0;
  if (x === Infinity) return 1;
  if (!Number.isFinite(x)) return Number.NaN;
  return 0.5 * (1 + erf(x / Math.SQRT2));
}
