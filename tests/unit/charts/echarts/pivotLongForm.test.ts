import { describe, it, expect } from 'vitest';
import { pivotLongForm } from '@/charts/echarts/pivotLongForm';

describe('pivotLongForm', () => {
  it('pivots long-form rows into a group × key matrix in first-seen order', () => {
    const { keys, groups, matrix } = pivotLongForm(
      ['Q1', 'Q1', 'Q2', 'Q2'],
      ['A', 'B', 'A', 'B'],
      [10, 5, 20, 7],
    );
    expect(keys).toEqual(['Q1', 'Q2']);
    expect(groups).toEqual(['A', 'B']);
    // matrix[groupIndex][keyIndex]
    expect(matrix).toEqual([[10, 20], [5, 7]]);
  });

  it('sums duplicate (key, group) rows rather than overwriting', () => {
    const { matrix } = pivotLongForm(['Q1', 'Q1'], ['A', 'A'], [10, 3]);
    expect(matrix).toEqual([[13]]);
  });

  it('backfills missing (key, group) cells with 0', () => {
    const { keys, groups, matrix } = pivotLongForm(['Q1', 'Q2'], ['A', 'B'], [10, 7]);
    expect(keys).toEqual(['Q1', 'Q2']);
    expect(groups).toEqual(['A', 'B']);
    expect(matrix).toEqual([[10, 0], [0, 7]]);
  });

  it('does not collide when key/group values contain spaces', () => {
    const { matrix, keys, groups } = pivotLongForm(
      ['West Region', 'Region'],
      ['North', 'North West'],
      [1, 2],
    );
    expect(keys).toEqual(['West Region', 'Region']);
    expect(groups).toEqual(['North', 'North West']);
    expect(matrix).toEqual([[1, 0], [0, 2]]);
  });

  it('treats non-finite values as a zero contribution', () => {
    const { matrix } = pivotLongForm(['Q1', 'Q2'], ['A', 'A'], [NaN, 5]);
    expect(matrix).toEqual([[0, 5]]);
  });

  it('returns empty structures for empty input', () => {
    expect(pivotLongForm([], [], [])).toEqual({ keys: [], groups: [], matrix: [] });
  });
});
