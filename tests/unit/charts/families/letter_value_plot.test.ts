import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/letter_value_plot';
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

function view(groups: unknown[], values: unknown[]): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays: { group: groups, value: values }, columns: [], rowCount: values.length };
}

type BoxSeries = { name: string; type: string; data: number[][]; itemStyle: { color: string; opacity: number } };

const cfg: ChartConfig = { chartType: 'letter_value_plot', columns: { group: 'group', value: 'value' }, options: {} };

describe('letter_value_plot', () => {
  it('registers with group/value roles in the distribution family', () => {
    const def = chartRegistry.get('letter_value_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['group', 'value']);
  });

  it('builds progressively deeper boxplot layers', () => {
    const opt = (chartRegistry.get('letter_value_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A', 'A', 'A', 'A'], [1, 2, 3, 4]), cfg, theme()) as EChartsOption;
    const series = opt.series as BoxSeries[];
    expect(series.map((item) => item.name)).toEqual(['50%', '75%', '87.5%']);
    expect(series[0]).toMatchObject({ type: 'boxplot', itemStyle: { color: '#f00', opacity: 0.7 } });
    expect(series[0].data[0][2]).toBe(2.5);
  });

  it('handles single-value groups without interpolation', () => {
    const opt = (chartRegistry.get('letter_value_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A'], [7]), cfg, theme()) as EChartsOption;
    const series = opt.series as BoxSeries[];
    expect(series[0].data[0]).toEqual([7, 7, 7, 7, 7]);
  });

  it('renders an empty state when grouped values are not finite', () => {
    const el = chartRegistry.get('letter_value_plot')!.createRenderer().render(view(['A'], ['x']), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });

  it('renders an empty state when required columns are missing', () => {
    const el = chartRegistry.get('letter_value_plot')!.createRenderer().render(view(['A'], [1]), { ...cfg, columns: { group: 'missing', value: 'also_missing' } }, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });
});
