import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/pp_plot';
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

function view(values: unknown[]): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays: { v: values }, columns: [], rowCount: values.length };
}

const cfg: ChartConfig = { chartType: 'pp_plot', columns: { value: 'v' }, options: {} };

describe('pp_plot', () => {
  it('registers in the distribution family', () => {
    const def = chartRegistry.get('pp_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
  });

  it('builds theoretical-vs-empirical probability points and a unit reference line', () => {
    const opt = (chartRegistry.get('pp_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([1, 2, 3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: number[][]; itemStyle: { color: string }; lineStyle?: { color: string } }>;
    expect(series[0].type).toBe('scatter');
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[0].data.map((point) => point[1])).toEqual([1 / 6, 0.5, 5 / 6]);
    expect(series[0].data[1][0]).toBeCloseTo(0.5, 6);
    expect(series[1]).toMatchObject({ type: 'line', data: [[0, 0], [1, 1]], lineStyle: { color: '#0f0' } });
  });

  it('uses 0.5 theoretical probability for constant finite samples', () => {
    const opt = (chartRegistry.get('pp_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([2, 2, 2]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data.map((point) => point[0])).toEqual([0.5, 0.5, 0.5]);
  });

  it('renders the empty state when the referenced column is missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = chartRegistry.get('pp_plot')!.createRenderer().render(dv, { chartType: 'pp_plot', columns: { value: 'missing' }, options: {} }, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });
});
