import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/cumulative_distribution_plot';
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
  return { sourceId: 'x', rows: [], filters: [], columnArrays: { v: values }, columns: [], rowCount: values.length };
}

const cfg: ChartConfig = { chartType: 'cumulative_distribution_plot', columns: { value: 'v' }, options: {} };

describe('cumulative_distribution_plot', () => {
  it('registers in the distribution family', () => {
    const def = chartRegistry.get('cumulative_distribution_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
  });

  it('builds a smoothed cumulative-probability line from finite sorted values', () => {
    const opt = (chartRegistry.get('cumulative_distribution_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([3, NaN, 1, 2]), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ type: string; smooth: boolean; data: number[][]; lineStyle: { color: string } }>)[0];
    expect(series).toMatchObject({ type: 'line', smooth: true, lineStyle: { color: '#f00' } });
    expect(series.data).toEqual([[1, 1 / 3], [2, 2 / 3], [3, 1]]);
    expect((opt.yAxis as { name: string }).name).toBe('Cumulative probability');
  });

  it('renders the empty state when no finite values remain', () => {
    const el = chartRegistry.get('cumulative_distribution_plot')!.createRenderer().render(view(['x', Infinity]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('falls back to empty points when the referenced column is missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = (chartRegistry.get('cumulative_distribution_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([]);
  });
});
