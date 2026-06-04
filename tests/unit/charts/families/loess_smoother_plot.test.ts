import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/loess_smoother_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'loess_smoother_plot', columns: { x: 'x', y: 'y' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 5,
    columnArrays: { x: [3, 1, 2, Infinity, 4], y: [9, 1, 4, 8, 'bad'] },
    columns: [],
  };
}

describe('loess_smoother_plot', () => {
  it('registers in the relationships family', () => {
    expect(chartRegistry.get('loess_smoother_plot')!.family).toBe('relationships');
  });

  it('sorts finite points and adds a smoothed line', () => {
    const opt = (chartRegistry.get('loess_smoother_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[][]; lineStyle?: { color: string; width: number } }>;
    expect(series[0].name).toBe('Observed');
    expect(series[0].data).toEqual([[1, 1], [2, 4], [3, 9]]);
    expect(series[1].name).toBe('Smoothed');
    expect(series[1].data).toEqual([[1, 2.5], [2, 14 / 3], [3, 6.5]]);
    expect(series[1].lineStyle).toEqual({ color: '#0f0', width: 3 });
  });

  it('renders an empty state when no finite pairs remain', () => {
    const dv: DataView = { ...view(), columnArrays: { x: ['bad'], y: [NaN] }, rowCount: 1 };
    const el = chartRegistry.get('loess_smoother_plot')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No x/y points to chart');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = { chartType: 'loess_smoother_plot', columns: { x: 'missing_x', y: 'missing_y' }, options: {} };
    const el = chartRegistry.get('loess_smoother_plot')!.createRenderer().render(view(), missing, theme());
    expect((el.props as { message: string }).message).toBe('No x/y points to chart');
  });

  it('builds empty observed and smoothed series when buildOption is called with no points', () => {
    const missing: ChartConfig = { chartType: 'loess_smoother_plot', columns: { x: 'missing_x', y: 'missing_y' }, options: {} };
    const opt = (chartRegistry.get('loess_smoother_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), missing, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>).map((series) => series.data)).toEqual([[], []]);
  });
});
