import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/horizontal_bar';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('horizontal_bar registration', () => {
  it('registers under type "horizontal_bar" with the categorical family', () => {
    const def = chartRegistry.get('horizontal_bar');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('horizontal_bar buildOption', () => {
  const def = () => chartRegistry.get('horizontal_bar')!;

  it('swaps axes: value on x, categories on y, with a horizontal bar series', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [10, 20, 30] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'horizontal_bar', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.xAxis as Record<string, unknown>).axisLine).toBeUndefined();
    expect((opt.yAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'b', 'c']);

    const series = opt.series as Array<{ type: string; data: unknown[]; itemStyle: { color: string } }>;
    expect(series[0].type).toBe('bar');
    expect(series[0].data).toEqual([10, 20, 30]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('coerces non-string category values to strings for the category axis', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: [1, 2], val: [5, 6] },
      columns: [
        { name: 'cat', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'horizontal_bar', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['1', '2']);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'horizontal_bar', columns: { category: 'missing', value: 'also_missing' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });

  it('aggregates repeated category keys by summing and drops non-finite values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'a', 'b'], val: [10, 5, Number.NaN, 7] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'horizontal_bar', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'b']);
    expect((opt.series as Array<{ data: number[] }>)[0].data).toEqual([10, 12]);
  });
});
