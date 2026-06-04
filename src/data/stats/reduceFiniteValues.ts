export type FiniteReduceOp = 'sum' | 'mean' | 'min' | 'max' | 'median';

/**
 * Reduce a finite-number array to a single scalar. Returns 0 for an empty array.
 * Uses reduce (never the Math.min/max spread) so it never overflows the call stack
 * on large inputs. Shared by groupByAggregate and the gauge chart.
 */
export function reduceFiniteValues(values: number[], op: FiniteReduceOp): number {
  if (values.length === 0) {
    return 0;
  }
  switch (op) {
    case 'sum': return values.reduce((acc, v) => acc + v, 0);
    case 'mean': return values.reduce((acc, v) => acc + v, 0) / values.length;
    case 'min': return values.reduce((a, b) => (a < b ? a : b));
    case 'max': return values.reduce((a, b) => (a > b ? a : b));
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = sorted.length >> 1;
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
  }
}
