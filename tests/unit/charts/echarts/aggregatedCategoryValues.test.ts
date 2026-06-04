import { describe, it, expect } from 'vitest';
import { aggregatedCategoryValues } from '@/charts/echarts/aggregatedCategoryValues';
import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

function view(categories: unknown[], values: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { cat: categories, val: values },
    columns: [
      { name: 'cat', type: 'category', nullable: false, uniqueCount: categories.length, nullCount: 0 },
      { name: 'val', type: 'float', nullable: true, uniqueCount: values.length, nullCount: 0 },
    ],
    rowCount: Math.max(categories.length, values.length),
  };
}

const cfg: ChartConfig = { chartType: 'x', columns: { category: 'cat', value: 'val' }, options: {} };

describe('aggregatedCategoryValues', () => {
  it('sums repeated category keys, preserving first-seen order', () => {
    const result = aggregatedCategoryValues(view(['North', 'South', 'North', 'South'], [10, 5, 20, 7]), cfg);
    expect(result).toEqual([
      { name: 'North', value: 30 },
      { name: 'South', value: 12 },
    ]);
  });

  it('drops non-finite values before summing', () => {
    const result = aggregatedCategoryValues(view(['a', 'a', 'b'], [10, Number.NaN, 4]), cfg);
    expect(result).toEqual([
      { name: 'a', value: 10 },
      { name: 'b', value: 4 },
    ]);
  });

  it('omits a category whose every value is non-finite (so the empty-state guard still fires)', () => {
    expect(aggregatedCategoryValues(view(['a', 'a'], [Number.NaN, Infinity]), cfg)).toEqual([]);
  });

  it('returns [] when the columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    expect(aggregatedCategoryValues(dv, { chartType: 'x', columns: { category: 'no', value: 'no2' }, options: {} })).toEqual([]);
  });
});
