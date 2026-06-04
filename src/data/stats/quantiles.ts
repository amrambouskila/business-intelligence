export interface FiveNumberSummary {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

// Type-7 / Excel PERCENTILE.INC linear-interpolation percentile on a pre-sorted array.
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) {
    return sorted[0];
  }
  const rank = p * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const frac = rank - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

export function quantiles(values: number[]): FiveNumberSummary {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  }
  return {
    min: sorted[0],
    q1: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    q3: percentile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}
