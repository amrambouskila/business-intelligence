import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/mosaic_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('mosaic_plot registration', () => {
  it('registers under type "mosaic_plot" with the categorical family', () => {
    const def = chartRegistry.get('mosaic_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('mosaic_plot buildOption', () => {
  const def = () => chartRegistry.get('mosaic_plot')!;

  it('builds treemap nodes from positive contingency counts', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { a: ['East', 'East', 'West', 'West'], b: ['Q1', 'Q2', 'Q1', 'Q2'], count: [10, 20, 0, 30] },
      columns: [],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'mosaic_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ type: string; data: Array<{ name: string; value: number; children: Array<{ name: string; value: number }> }> }>)[0];

    expect(series.type).toBe('treemap');
    expect(series.data.map((node) => [node.name, node.value])).toEqual([['East', 30], ['West', 30]]);
    expect(series.data[0].children.map((node) => [node.name, node.value])).toEqual([['Q1', 10], ['Q2', 20]]);
    expect(series.data[1].children).toEqual([{ name: 'Q2', value: 30, itemStyle: { color: '#0f0' } }]);
  });

  it('renders the empty state when no positive counts remain', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [], columnArrays: { a: ['East'], b: ['Q1'], count: [0] }, columns: [], rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'mosaic_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive counts to display');
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const cfg: ChartConfig = { chartType: 'mosaic_plot', columns: { cat_a: 'a', cat_b: 'b', count: 'count' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive counts to display');
  });
});
