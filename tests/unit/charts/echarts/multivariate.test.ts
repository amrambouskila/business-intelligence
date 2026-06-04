import { describe, it, expect } from 'vitest';
import { associationMatrix, columnExtents, extent, finiteNumericRows, radvizPoints } from '@/charts/echarts/multivariate';
import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

const cfg: ChartConfig = { chartType: 'x', columns: { f1: 'a', f2: 'b', f3: 'c' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    rowCount: 4,
    columns: [],
    columnArrays: {
      a: [1, 2, 3, 'bad'],
      b: [2, 4, 6, 8],
      c: [3, 2, 1, 0],
    },
  };
}

describe('multivariate helpers', () => {
  it('extracts finite numeric rows for configured roles', () => {
    expect(finiteNumericRows(view(), cfg, ['f1', 'f2', 'f3'])).toEqual({
      names: ['a', 'b', 'c'],
      rows: [[1, 2, 3], [2, 4, 2], [3, 6, 1]],
    });
    expect(finiteNumericRows(view(), { ...cfg, columns: {} }, ['f1'])).toEqual({ names: [], rows: [] });
  });

  it('computes empty, degenerate, and normal extents', () => {
    expect(extent([])).toEqual({ min: 0, max: 1 });
    expect(extent([5, 5])).toEqual({ min: 4.5, max: 5.5 });
    expect(columnExtents([[1, 4], [3, 2]])).toEqual([{ min: 1, max: 3 }, { min: 2, max: 4 }]);
    expect(columnExtents([])).toEqual([]);
  });

  it('computes covariance and correlation matrices', () => {
    const input = finiteNumericRows(view(), cfg, ['f1', 'f2', 'f3']);
    const covariance = associationMatrix(input, 'covariance');
    const correlation = associationMatrix(input, 'correlation');
    expect(covariance.find((cell) => cell.row === 'a' && cell.col === 'b')?.value).toBe(2);
    expect(correlation.find((cell) => cell.row === 'a' && cell.col === 'b')?.value).toBeCloseTo(1);
    expect(associationMatrix({ names: ['a'], rows: [[1]] }, 'correlation')[0].value).toBe(0);
  });

  it('projects rows into RadViz coordinates with a zero-weight fallback', () => {
    const projected = radvizPoints({ names: ['a', 'b', 'c'], rows: [[1, 2, 3], [3, 2, 1]] });
    expect(projected).toHaveLength(2);
    expect(projected[0][0]).toBeLessThanOrEqual(1);
    expect(radvizPoints({ names: ['a', 'b'], rows: [[1, 1], [2, 2]] })[0]).toEqual([0, 0]);
  });
});
