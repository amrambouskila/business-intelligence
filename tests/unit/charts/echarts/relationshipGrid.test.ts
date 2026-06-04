import { describe, it, expect } from 'vitest';
import { binLabel, densityGrid, finiteXY, finiteXYZ, meanGrid } from '@/charts/echarts/relationshipGrid';
import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

const cfg: ChartConfig = { chartType: 'x', columns: { x: 'x', y: 'y', z: 'z' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    rowCount: 5,
    columnArrays: {
      x: [1, 2, 3, Infinity, 'bad'],
      y: [4, 5, NaN, 6, 7],
      z: [10, 20, 30, 40, null],
    },
    columns: [],
  };
}

describe('relationshipGrid helpers', () => {
  it('extracts finite x/y pairs and falls back to empty arrays for missing columns', () => {
    expect(finiteXY(view(), cfg)).toEqual([[1, 4], [2, 5]]);
    expect(finiteXY(view(), { ...cfg, columns: { x: 'missing', y: 'y' } })).toEqual([]);
  });

  it('extracts finite x/y/z triples and falls back to empty arrays for missing columns', () => {
    expect(finiteXYZ(view(), cfg)).toEqual([[1, 4, 10], [2, 5, 20]]);
    expect(finiteXYZ(view(), { ...cfg, columns: { x: 'missing', y: 'y', z: 'z' } })).toEqual([]);
    expect(finiteXYZ(view(), { ...cfg, columns: { x: 'x', y: 'missing', z: 'z' } })).toEqual([]);
    expect(finiteXYZ(view(), { ...cfg, columns: { x: 'x', y: 'y', z: 'missing' } })).toEqual([]);
  });

  it('formats bin labels with compact numeric precision', () => {
    expect(binLabel(12.3456)).toBe('12.35');
  });

  it('returns an empty density grid for no points', () => {
    expect(densityGrid([], 10)).toEqual({ cells: [], xLabels: [], yLabels: [], maxValue: 0 });
  });

  it('counts density cells with clamped bin counts and degenerate extents', () => {
    const grid = densityGrid([[5, 5], [5, 5], [5, 5]], 0);
    expect(grid.xLabels).toHaveLength(1);
    expect(grid.yLabels).toHaveLength(1);
    expect(grid.cells).toEqual([{ xIndex: 0, yIndex: 0, xCenter: 5, yCenter: 5, value: 3 }]);
    expect(grid.maxValue).toBe(3);
  });

  it('sorts density cells by y bin when x bins tie', () => {
    const grid = densityGrid([[0, 1], [0, 0]], 2);
    expect(grid.cells.map((cell) => [cell.xIndex, cell.yIndex])).toEqual([[1, 0], [1, 1]]);
  });

  it('averages z values per grid cell', () => {
    const grid = meanGrid([[0, 0, 2], [0.2, 0.2, 4], [1, 1, 10]], 2);
    expect(grid.cells.map((cell) => [cell.xIndex, cell.yIndex, cell.value])).toEqual([[0, 0, 3], [1, 1, 10]]);
    expect(grid.minValue).toBe(3);
    expect(grid.maxValue).toBe(10);
  });

  it('averages duplicate degenerate mean-grid cells with clamped bin counts', () => {
    const grid = meanGrid([[5, 5, 2], [5, 5, 4], [5, 5, 6]], 0);
    expect(grid.xLabels).toHaveLength(1);
    expect(grid.yLabels).toHaveLength(1);
    expect(grid.cells).toEqual([{ xIndex: 0, yIndex: 0, xCenter: 5, yCenter: 5, value: 4 }]);
    expect(grid.minValue).toBe(4);
    expect(grid.maxValue).toBe(4);
  });

  it('tracks mean-grid min and max values regardless of sorted cell order', () => {
    const grid = meanGrid([[0, 0, 10], [1, 1, 3]], 2);
    expect(grid.cells.map((cell) => cell.value)).toEqual([10, 3]);
    expect(grid.minValue).toBe(3);
    expect(grid.maxValue).toBe(10);
  });

  it('sorts mean-grid cells by y bin when x bins tie', () => {
    const grid = meanGrid([[0, 1, 2], [0, 0, 4]], 2);
    expect(grid.cells.map((cell) => [cell.xIndex, cell.yIndex, cell.value])).toEqual([[1, 0, 4], [1, 1, 2]]);
  });

  it('returns an empty mean grid for no triples', () => {
    expect(meanGrid([], 8)).toEqual({ cells: [], xLabels: [], yLabels: [], minValue: 0, maxValue: 0 });
  });
});
