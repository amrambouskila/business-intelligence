import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/raincloud_plot';
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

function view(groups: unknown[], values: unknown[]): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays: { group: groups, value: values }, columns: [], rowCount: values.length };
}

type RainSeries = { name: string; type: string; data: number[][]; lineStyle?: { color: string; width: number } };

const cfg: ChartConfig = { chartType: 'raincloud_plot', columns: { group: 'group', value: 'value' }, options: {} };

describe('raincloud_plot', () => {
  it('registers with group/value roles in the distribution family', () => {
    const def = chartRegistry.get('raincloud_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['group', 'value']);
  });

  it('builds cloud, rain, and median series per group', () => {
    const opt = (chartRegistry.get('raincloud_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A', 'A', 'B'], [1, 2, 10]), cfg, theme()) as EChartsOption;
    const series = opt.series as RainSeries[];
    expect(series.map((item) => item.name)).toEqual(['A cloud', 'A rain', 'A median', 'B cloud', 'B rain', 'B median']);
    expect(series[0].type).toBe('line');
    expect(series[1].type).toBe('scatter');
    expect(series[2].lineStyle).toEqual({ color: '#f00', width: 3 });
    expect(((opt.yAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter)(9)).toBe('');
  });

  it('renders an empty state when no grouped values can be charted', () => {
    const el = chartRegistry.get('raincloud_plot')!.createRenderer().render(view(['A'], [Infinity]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });

  it('renders an empty state when required columns are missing', () => {
    const el = chartRegistry.get('raincloud_plot')!.createRenderer().render(view(['A'], [1]), { ...cfg, columns: { group: 'missing', value: 'also_missing' } }, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });
});
