import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/rug_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(values: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { value: values },
    columns: [{ name: 'value', type: 'float', nullable: false, uniqueCount: values.length, nullCount: 0 }],
    rowCount: values.length,
  };
}

type RugSeries = { type: string; data: Array<[number, number]>; symbol: string; symbolSize: [number, number]; itemStyle: { color: string; opacity: number } };

describe('rug_plot registration', () => {
  it('registers under the distribution family', () => {
    const def = chartRegistry.get('rug_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('rug_plot buildOption', () => {
  it('renders finite values as tick-like scatter marks', () => {
    const cfg: ChartConfig = { chartType: 'rug_plot', columns: { value: 'value' }, options: {} };
    const opt = (chartRegistry.get('rug_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([1, NaN, 2, Infinity, 3]), cfg, theme()) as EChartsOption;
    const series = (opt.series as RugSeries[])[0];
    expect(series).toMatchObject({
      type: 'scatter',
      data: [[1, 0], [2, 0], [3, 0]],
      symbol: 'rect',
      symbolSize: [2, 16],
      itemStyle: { color: '#f00', opacity: 0.75 },
    });
    expect((opt.yAxis as Record<string, unknown>).axisLabel).toEqual({ show: false });
  });

  it('renders the empty state when the value column is missing or non-finite', () => {
    const renderer = chartRegistry.get('rug_plot')!.createRenderer();
    const missing: ChartConfig = { chartType: 'rug_plot', columns: { value: 'missing' }, options: {} };
    expect((renderer.render(view([1]), missing, theme()).props as { message: string }).message).toBe('No numeric values to chart');

    const nonFinite: ChartConfig = { chartType: 'rug_plot', columns: { value: 'value' }, options: {} };
    expect((renderer.render(view([NaN, Infinity]), nonFinite, theme()).props as { message: string }).message).toBe('No numeric values to chart');
  });
});
