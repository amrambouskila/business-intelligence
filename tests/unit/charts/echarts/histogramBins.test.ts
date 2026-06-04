import { describe, it, expect } from 'vitest';
import { histogramBins } from '@/charts/echarts/histogramBins';

describe('histogramBins', () => {
  it('bins evenly-spaced values into equal-width bins with correct edges and centers', () => {
    // min=0, max=10, 5 bins -> width 2; the max (10) clamps into the last bin.
    const { binEdges, counts, binCenters } = histogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 10], 5);
    expect(counts).toEqual([2, 2, 2, 2, 2]);
    expect(binCenters).toEqual([1, 3, 5, 7, 9]);
    expect(binEdges).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('clamps a bin count below 1 to a single bin instead of silently dropping all rows', () => {
    const { binEdges, counts, binCenters } = histogramBins([1, 2, 3], 0);
    expect(counts).toEqual([3]);
    expect(binEdges).toEqual([1, 3]);
    expect(binCenters).toEqual([2]);
  });

  it('derives min and max from unordered input (covers both reduce directions)', () => {
    const { binEdges, counts, binCenters } = histogramBins([9, 1, 5], 2);
    expect(binEdges).toEqual([1, 5, 9]);
    expect(counts).toEqual([1, 2]);
    expect(binCenters).toEqual([3, 7]);
  });

  it('produces binCount+1 edges and binCount counts', () => {
    const { binEdges, counts, binCenters } = histogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
    expect(binEdges).toHaveLength(6);
    expect(counts).toHaveLength(5);
    expect(binCenters).toHaveLength(5);
  });

  it('clamps the maximum value into the last bin (max not dropped)', () => {
    const { counts } = histogramBins([0, 10], 5);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(2);
    expect(counts[4]).toBeGreaterThanOrEqual(1);
  });

  it('places all values in a single effective bin when max === min', () => {
    const { counts, binEdges } = histogramBins([5, 5, 5], 4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
    // width collapses to 1, so every value lands in bin 0
    expect(counts[0]).toBe(3);
    expect(binEdges).toEqual([5, 6, 7, 8, 9]);
  });

  it('drops non-finite values before binning', () => {
    const { counts } = histogramBins([0, NaN, 5, Infinity, 10, -Infinity], 5);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('returns empty arrays for an empty input', () => {
    expect(histogramBins([], 5)).toEqual({ binEdges: [], counts: [], binCenters: [] });
  });

  it('returns empty arrays when every value is non-finite', () => {
    expect(histogramBins([NaN, Infinity, -Infinity], 5)).toEqual({
      binEdges: [],
      counts: [],
      binCenters: [],
    });
  });

  it('keeps binCenters as the midpoint of each edge pair', () => {
    const { binEdges, binCenters } = histogramBins([0, 2, 4, 6], 2);
    expect(binCenters).toEqual([
      (binEdges[0] + binEdges[1]) / 2,
      (binEdges[1] + binEdges[2]) / 2,
    ]);
  });
});
