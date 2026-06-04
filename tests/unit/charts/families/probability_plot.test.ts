import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/probability_plot';
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

const cfg: ChartConfig = { chartType: 'probability_plot', columns: { value: 'v' }, options: {} };

describe('probability_plot', () => {
  it('registers in the distribution family', () => {
    const def = chartRegistry.get('probability_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
  });

  it('builds sorted sample values against normal quantile plotting positions', () => {
    const opt = (chartRegistry.get('probability_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([3, 1, 2]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: number[][]; itemStyle: { color: string }; lineStyle?: { color: string } }>;
    expect(series[0].type).toBe('scatter');
    expect(series[0].data.map((point) => point[0])).toEqual([1, 2, 3]);
    expect(series[0].data[1][1]).toBeCloseTo(0, 6);
    expect(series[1].data).toEqual([series[0].data[0], series[0].data[2]]);
    expect(series[1].lineStyle!.color).toBe('#0f0');
  });

  it('renders an empty reference line when no finite values are available in buildOption', () => {
    const opt = (chartRegistry.get('probability_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['x']), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });

  it('renders the empty state when no finite values remain', () => {
    const el = chartRegistry.get('probability_plot')!.createRenderer().render(view([NaN]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('falls back to empty points when the referenced column is missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = (chartRegistry.get('probability_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });
});
