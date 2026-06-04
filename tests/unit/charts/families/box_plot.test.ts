import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/box_plot';
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

type BoxSeries = { type: string; data: number[][]; itemStyle: { color: string } };

function build(dv: DataView, cfg: ChartConfig): EChartsOption {
  return (chartRegistry.get('box_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme());
}

describe('box_plot registration', () => {
  it('registers under type "box_plot" with the distribution family', () => {
    const def = chartRegistry.get('box_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('box_plot buildOption', () => {
  it('builds a single box from all finite values labeled "All"', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { val: [3, 1, 4, 2, 5] },
      columns: [{ name: 'val', type: 'integer', nullable: false, uniqueCount: 5, nullCount: 0 }],
      rowCount: 5,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'val' }, options: {} };
    const opt = build(dv, cfg);

    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['All']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    const series = opt.series as BoxSeries[];
    expect(series[0].type).toBe('boxplot');
    // type-7 quantiles of sorted [1,2,3,4,5]: min,q1,median,q3,max.
    expect(series[0].data).toEqual([[1, 2, 3, 4, 5]]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('drops non-finite values before computing the summary', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { val: [1, NaN, 2, Infinity, 3, 4, 5] },
      columns: [{ name: 'val', type: 'float', nullable: true, uniqueCount: 5, nullCount: 0 }],
      rowCount: 7,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'val' }, options: {} };
    const series = build(dv, cfg).series as BoxSeries[];
    expect(series[0].data).toEqual([[1, 2, 3, 4, 5]]);
  });

  it('computes one box per group in first-seen order when a group column is set', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        grp: ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B'],
        val: [1, 2, 3, 4, 5, 10, 20, 30],
      },
      columns: [
        { name: 'grp', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 8, nullCount: 0 },
      ],
      rowCount: 8,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'val', group: 'grp' }, options: {} };
    const opt = build(dv, cfg);

    expect((opt.xAxis as { data: string[] }).data).toEqual(['A', 'B']);
    const series = opt.series as BoxSeries[];
    // A: type-7 quantiles of [1,2,3,4,5]; B: of [10,20,30].
    expect(series[0].data).toEqual([
      [1, 2, 3, 4, 5],
      [10, 15, 20, 25, 30],
    ]);
  });

  it('preserves group order by first appearance, not sort order', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        grp: ['Z', 'A', 'Z', 'A'],
        val: [1, 3, 5, 7],
      },
      columns: [
        { name: 'grp', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'val', group: 'grp' }, options: {} };
    expect((build(dv, cfg).xAxis as { data: string[] }).data).toEqual(['Z', 'A']);
  });

  it('drops non-finite values within the grouped path', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { grp: ['A', 'A', 'B'], val: [1, NaN, 5] },
      columns: [
        { name: 'grp', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'val', group: 'grp' }, options: {} };
    const opt = build(dv, cfg);
    expect((opt.xAxis as { data: string[] }).data).toEqual(['A', 'B']);
    // A keeps only the single finite value 1 (NaN dropped); B keeps 5.
    expect((opt.series as BoxSeries[])[0].data).toEqual([[1, 1, 1, 1, 1], [5, 5, 5, 5, 5]]);
  });

  it('reports empty when a group column is set but its data is absent', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { val: [1, 2, 3] },
      columns: [{ name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 }],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'val', group: 'missing_grp' }, options: {} };
    const el = chartRegistry.get('box_plot')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('reports empty when there are no finite values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { val: [NaN, Infinity, -Infinity] },
      columns: [{ name: 'val', type: 'float', nullable: true, uniqueCount: 0, nullCount: 3 }],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'val' }, options: {} };
    const el = chartRegistry.get('box_plot')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('reports empty when the value column is missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'box_plot', columns: { value: 'missing' }, options: {} };
    const el = chartRegistry.get('box_plot')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });
});
