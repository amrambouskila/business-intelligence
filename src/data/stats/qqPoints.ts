/** Sample-vs-theoretical-normal quantiles for a Q-Q plot. */

import { normalQuantile } from './normalQuantile';

export interface QQPoint {
  theoretical: number;
  sample: number;
}

/**
 * Q-Q points against the standard normal. The sorted sample values are paired
 * with theoretical quantiles at plotting positions p = (i + 0.5)/n, which keeps
 * every p strictly inside (0, 1) so no theoretical quantile is infinite.
 * Non-finite inputs are dropped; empty input returns [].
 */
export function qqPoints(values: number[]): QQPoint[] {
  const sorted = values.filter((v): v is number => Number.isFinite(v)).sort((a, b) => a - b);
  const n = sorted.length;
  const points: QQPoint[] = [];
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n;
    points.push({ theoretical: normalQuantile(p), sample: sorted[i] });
  }
  return points;
}
