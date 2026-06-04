import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/marimekko';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

interface CustomSeries {
  type: string;
  data: Array<[number, number, number, number, string, string, number, number]>;
  renderItem: (params: unknown, api: { value: (d: number) => number | string; coord: (p: Array<number | string>) => number[] }) => unknown;
}

describe('marimekko registration', () => {
  it('registers under type "marimekko" with the categorical family', () => {
    const def = chartRegistry.get('marimekko');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('marimekko buildOption', () => {
  const def = () => chartRegistry.get('marimekko')!;

  it('builds variable-width stacked rectangles from value and width metrics', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        region: ['East', 'East', 'West', 'West'],
        quarter: ['Q1', 'Q2', 'Q1', 'Q2'],
        sales: [10, 30, 20, 20],
        profit: [40, 40, 20, 20],
      },
      columns: [],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'marimekko', columns: { category: 'region', subgroup: 'quarter', value: 'sales', width_metric: 'profit' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as CustomSeries[])[0];

    expect(series.type).toBe('custom');
    expect(series.data).toEqual([
      [0, 66.66666666666666, 0, 25, 'East', 'Q1', 10, 0],
      [0, 66.66666666666666, 25, 100, 'East', 'Q2', 30, 1],
      [66.66666666666666, 100, 0, 50, 'West', 'Q1', 20, 0],
      [66.66666666666666, 100, 50, 100, 'West', 'Q2', 20, 1],
    ]);
  });

  it('draws rectangle geometry using chart coordinates', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { c: ['A'], s: ['B'], v: [10], w: [10] },
      columns: [],
      rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'marimekko', columns: { category: 'c', subgroup: 's', value: 'v', width_metric: 'w' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as CustomSeries[])[0];
    const el = series.renderItem({}, {
      value: (d) => series.data[0][d],
      coord: ([x, y]) => [Number(x) * 2, Number(y) * 3],
    }) as { type: string; shape: Record<string, number>; style: { fill: string; stroke: string; lineWidth: number } };

    expect(el.type).toBe('rect');
    expect(el.shape).toEqual({ x: 0, y: 300, width: 200, height: -300 });
    expect(el.style).toEqual({ fill: '#f00', stroke: '#000', lineWidth: 1 });
  });

  it('renders the empty state when the width metric has no positive finite values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [], columnArrays: { c: ['A'], s: ['B'], v: [10], w: [0] }, columns: [], rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'marimekko', columns: { category: 'c', subgroup: 's', value: 'v', width_metric: 'w' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive values and width metric to display');
  });

  it('skips invalid widths, zero-total categories, and zero subgroup values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        region: ['East', 'East', 'West', 'North', 'North'],
        quarter: ['Q1', 'Q2', 'Q1', 'Q1', 'Q2'],
        sales: [10, 0, 0, 5, 5],
        profit: [40, Number.NaN, 20, -1, 'x'],
      },
      columns: [],
      rowCount: 5,
    };
    const cfg: ChartConfig = { chartType: 'marimekko', columns: { category: 'region', subgroup: 'quarter', value: 'sales', width_metric: 'profit' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as CustomSeries[])[0];

    expect(series.data).toEqual([[0, 66.66666666666666, 0, 100, 'East', 'Q1', 10, 0]]);
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const cfg: ChartConfig = { chartType: 'marimekko', columns: { category: 'c', subgroup: 's', value: 'v', width_metric: 'w' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive values and width metric to display');
  });
});
