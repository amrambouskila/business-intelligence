import { describe, it, expect } from 'vitest';
import { buildMatrixGrid, reorderMatrixGrid } from '@/charts/echarts/matrixGrid';

describe('buildMatrixGrid', () => {
  it('builds indexed matrix cells, categories, finite values, and min/max', () => {
    const grid = buildMatrixGrid(['r1', 'r2', 'r1'], ['c1', 'c1', 'c2'], [10, NaN, 30]);
    expect(grid.rowCategories).toEqual(['r1', 'r2']);
    expect(grid.colCategories).toEqual(['c1', 'c2']);
    expect(grid.cells).toEqual([[0, 0, 10], [0, 1, NaN], [1, 0, 30]]);
    expect(grid.finiteValues).toEqual([10, 30]);
    expect(grid.min).toBe(10);
    expect(grid.max).toBe(30);
  });

  it('returns default range for empty or all-non-finite data', () => {
    expect(buildMatrixGrid([], [], []).min).toBe(0);
    const grid = buildMatrixGrid(['r'], ['c'], [Infinity]);
    expect(grid.finiteValues).toEqual([]);
    expect(grid.min).toBe(0);
    expect(grid.max).toBe(1);
  });

  it('truncates to the shortest role length', () => {
    const grid = buildMatrixGrid(['r1', 'r2'], ['c1'], [5, 6]);
    expect(grid.cells).toEqual([[0, 0, 5]]);
    expect(grid.rowCategories).toEqual(['r1']);
  });
});

describe('reorderMatrixGrid', () => {
  it('remaps cells into requested category order', () => {
    const grid = buildMatrixGrid(['r1', 'r2'], ['c1', 'c2'], [10, 20]);
    const reordered = reorderMatrixGrid(grid, ['r2', 'r1'], ['c2', 'c1']);
    expect(reordered.rowCategories).toEqual(['r2', 'r1']);
    expect(reordered.colCategories).toEqual(['c2', 'c1']);
    expect(reordered.cells).toEqual([[1, 1, 10], [0, 0, 20]]);
    expect(reordered.finiteValues).toEqual([10, 20]);
  });

  it('drops requested categories that are not present', () => {
    const grid = buildMatrixGrid(['r1', 'r2'], ['c1', 'c2'], [10, 20]);
    const reordered = reorderMatrixGrid(grid, ['r2', 'missing'], ['c2']);
    expect(reordered.rowCategories).toEqual(['r2']);
    expect(reordered.colCategories).toEqual(['c2']);
    expect(reordered.cells).toEqual([[0, 0, 20]]);
  });

  it('drops malformed cells whose indexes do not resolve to categories', () => {
    const reordered = reorderMatrixGrid(
      {
        rowCategories: ['r1'],
        colCategories: ['c1'],
        cells: [[0, 0, 1], [0, 99, 2], [99, 0, 3]],
        finiteValues: [1, 2, 3],
        min: 1,
        max: 3,
      },
      ['r1'],
      ['c1'],
    );
    expect(reordered.cells).toEqual([[0, 0, 1]]);
  });
});
