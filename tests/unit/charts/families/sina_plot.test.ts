import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/sina_plot';
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

type ScatterSeries = { type: string; data: number[][]; symbolSize: number; itemStyle: { color: string; opacity: number } };

const cfg: ChartConfig = { chartType: 'sina_plot', columns: { group: 'group', value: 'value' }, options: {} };

describe('sina_plot', () => {
  it('registers with group/value roles in the distribution family', () => {
    const def = chartRegistry.get('sina_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['group', 'value']);
  });

  it('spreads grouped points by local density', () => {
    const opt = (chartRegistry.get('sina_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A', 'A', 'B'], [1, 2, 10]), cfg, theme()) as EChartsOption;
    const series = (opt.series as ScatterSeries[])[0];
    expect(series.type).toBe('scatter');
    expect(series.data).toHaveLength(3);
    expect(series.data[0][1]).not.toBe(0);
    expect(series.itemStyle).toEqual({ color: '#f00', opacity: 0.68 });
    expect(((opt.yAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter)(9)).toBe('');
  });

  it('renders an empty state when no finite grouped values exist', () => {
    const el = chartRegistry.get('sina_plot')!.createRenderer().render(view(['A'], [NaN]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });

  it('renders an empty state when required columns are missing', () => {
    const el = chartRegistry.get('sina_plot')!.createRenderer().render(view(['A'], [1]), { ...cfg, columns: { group: 'missing', value: 'also_missing' } }, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });
});
