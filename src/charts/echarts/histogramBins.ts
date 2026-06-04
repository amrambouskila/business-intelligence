export interface HistogramBins {
  binEdges: number[];
  counts: number[];
  binCenters: number[];
}

/**
 * Equal-width histogram binning shared by histogram and frequency-polygon charts
 * so both agree on edges/counts. Non-finite values are dropped; the maximum value
 * is clamped into the final bin (inclusive upper edge). When max === min the width
 * collapses to 1, yielding a single effective bin holding every value.
 */
export function histogramBins(values: number[], binCount: number): HistogramBins {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return { binEdges: [], counts: [], binCenters: [] };
  }

  // Clamp the bin count: (max-min)/0 is Infinity (truthy), which would bypass the
  // `|| 1` degenerate-width guard and silently drop every row.
  const n = binCount < 1 ? 1 : Math.floor(binCount);
  const min = finite.reduce((a, b) => (a < b ? a : b), Infinity);
  const max = finite.reduce((a, b) => (a > b ? a : b), -Infinity);
  const binWidth = (max - min) / n || 1;

  const binEdges: number[] = [];
  for (let i = 0; i <= n; i++) {
    binEdges.push(min + i * binWidth);
  }

  const counts = new Array<number>(n).fill(0);
  for (const v of finite) {
    const idx = Math.min(Math.floor((v - min) / binWidth), n - 1);
    counts[idx]++;
  }

  const binCenters = counts.map((_, i) => (binEdges[i] + binEdges[i + 1]) / 2);

  return { binEdges, counts, binCenters };
}
