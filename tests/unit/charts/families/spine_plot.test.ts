import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/spine_plot';
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

describe('spine_plot registration', () => {
  it('registers under type "spine_plot" with the categorical family', () => {
    const def = chartRegistry.get('spine_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('spine_plot buildOption', () => {
  const def = () => chartRegistry.get('spine_plot')!;

  it('builds variable-width normalized rectangles from a two-category count table', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { a: ['East', 'East', 'West', 'West'], b: ['Q1', 'Q2', 'Q1', 'Q2'], count: [10, 30, 20, 20] },
      columns: [],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'spine_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as CustomSeries[])[0];

    expect(series.type).toBe('custom');
    expect(series.data).toEqual([
      [0, 50, 0, 25, 'East', 'Q1', 10, 0],
      [0, 50, 25, 100, 'East', 'Q2', 30, 1],
      [50, 100, 0, 50, 'West', 'Q1', 20, 0],
      [50, 100, 50, 100, 'West', 'Q2', 20, 1],
    ]);
  });

  it('draws rectangle geometry using chart coordinates', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [], columnArrays: { a: ['A'], b: ['B'], count: [10] }, columns: [], rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'spine_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
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

  it('renders the empty state when no positive counts remain', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [], columnArrays: { a: ['A'], b: ['B'], count: [0] }, columns: [], rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'spine_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive counts to display');
  });

  it('skips zero-total categories and zero subgroup cells', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { a: ['East', 'East', 'West', 'West'], b: ['Q1', 'Q2', 'Q1', 'Q2'], count: [10, 0, 0, 0] },
      columns: [],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'spine_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as CustomSeries[])[0];

    expect(series.data).toEqual([[0, 100, 0, 100, 'East', 'Q1', 10, 0]]);
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const cfg: ChartConfig = { chartType: 'spine_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive counts to display');
  });
});
