import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/error_bar';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

type ScatterSeries = { type: string; data: number[]; itemStyle: { color: string } };
type CustomSeries = {
  type: string;
  data: number[][];
  renderItem: (params: unknown, api: { value: (d: number) => number; coord: (p: number[]) => number[] }) => unknown;
};

function build(dv: DataView, cfg: ChartConfig): EChartsOption {
  return (chartRegistry.get('error_bar')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme());
}

const cfg: ChartConfig = {
  chartType: 'error_bar',
  columns: { category: 'cat', estimate: 'est', lower: 'lo', upper: 'hi' },
  options: {},
};

describe('error_bar registration', () => {
  it('registers under type "error_bar" in the statistical family as an echarts chart', () => {
    const def = chartRegistry.get('error_bar');
    expect(def).toBeDefined();
    expect(def!.type).toBe('error_bar');
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['category', 'estimate', 'lower', 'upper']);
  });
});

describe('error_bar buildOption', () => {
  it('builds a category x-axis, a scatter of estimates, and a custom whisker series', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        cat: ['A', 'B', 'C'],
        est: [10, 20, 30],
        lo: [8, 17, 25],
        hi: [12, 23, 35],
      },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'est', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'lo', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'hi', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const opt = build(dv, cfg);

    expect((opt.xAxis as { type: string }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['A', 'B', 'C']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    const series = opt.series as [CustomSeries, ScatterSeries];
    expect(series[0].type).toBe('custom');
    // Each whisker datum is [categoryIndex, lower, upper].
    expect(series[0].data).toEqual([[0, 8, 12], [1, 17, 23], [2, 25, 35]]);

    expect(series[1].type).toBe('scatter');
    expect(series[1].data).toEqual([10, 20, 30]);
    expect(series[1].itemStyle.color).toBe('#f00');
  });

  it('stringifies non-string category values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: [1, 2], est: [5, 6], lo: [4, 5], hi: [6, 7] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'est', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'lo', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'hi', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    expect((build(dv, cfg).xAxis as { data: string[] }).data).toEqual(['1', '2']);
  });

  it('renderItem maps each whisker to a vertical line at the category x between lower and upper', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['A'], est: [10], lo: [8], hi: [12] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'est', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'lo', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'hi', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const series = build(dv, cfg).series as [CustomSeries, ScatterSeries];
    const datum = series[0].data[0]; // [0, 8, 12]
    // Stub the coord API: x = index*100, y = value (so lower=8 -> bottom, upper=12 -> top).
    const api = {
      value: (d: number) => datum[d],
      coord: (p: number[]) => [p[0] * 100, p[1]],
    };
    const el = series[0].renderItem({}, api) as {
      type: string;
      shape: { x1: number; y1: number; x2: number; y2: number };
      style: { stroke: string; lineWidth: number };
    };
    expect(el.type).toBe('line');
    expect(el.shape.x1).toBe(0);
    expect(el.shape.x2).toBe(0);
    expect(el.shape.y1).toBe(12); // top = upper
    expect(el.shape.y2).toBe(8); // bottom = lower
    expect(el.style.stroke).toBe('#f00');
    expect(el.style.lineWidth).toBe(2);
  });

  it('drops a row whose estimate is non-finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['A', 'B'], est: [NaN, 20], lo: [8, 17], hi: [12, 23] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'est', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
        { name: 'lo', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'hi', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const opt = build(dv, cfg);
    expect((opt.xAxis as { data: string[] }).data).toEqual(['B']);
    expect((opt.series as [CustomSeries, ScatterSeries])[1].data).toEqual([20]);
  });

  it('drops a row whose lower bound is non-finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['A', 'B'], est: [10, 20], lo: [Infinity, 17], hi: [12, 23] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'est', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'lo', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
        { name: 'hi', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    expect((build(dv, cfg).series as [CustomSeries, ScatterSeries])[1].data).toEqual([20]);
  });

  it('drops a row whose upper bound is non-finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['A', 'B'], est: [10, 20], lo: [8, 17], hi: [-Infinity, 23] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'est', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'lo', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'hi', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 2,
    };
    expect((build(dv, cfg).series as [CustomSeries, ScatterSeries])[1].data).toEqual([20]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const el = chartRegistry.get('error_bar')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No estimates to chart');
  });

  it('reports empty when every row has a non-finite bound', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['A', 'B'], est: [10, NaN], lo: [Infinity, 17], hi: [12, -Infinity] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'est', type: 'float', nullable: true, uniqueCount: 1, nullCount: 1 },
        { name: 'lo', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
        { name: 'hi', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const el = chartRegistry.get('error_bar')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No estimates to chart');
  });
});
