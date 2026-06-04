import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/quantile_dot_plot';
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

type ScatterSeries = { type: string; data: number[][]; symbolSize: number };

const cfg: ChartConfig = { chartType: 'quantile_dot_plot', columns: { value: 'value' }, options: {} };

describe('quantile_dot_plot', () => {
  it('registers with an optional group role', () => {
    const def = chartRegistry.get('quantile_dot_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.optionalColumns!.map((role) => role.role)).toEqual(['group']);
  });

  it('builds a minimum of five dots for a single finite distribution', () => {
    const opt = (chartRegistry.get('quantile_dot_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1, 2, 3]), cfg, theme()) as EChartsOption;
    const series = (opt.series as ScatterSeries[])[0];
    expect(series).toMatchObject({ type: 'scatter', symbolSize: 8 });
    expect(series.data).toHaveLength(5);
    expect(series.data[0][0]).toBeGreaterThanOrEqual(1);
  });

  it('uses group labels when a group column is assigned', () => {
    const opt = (chartRegistry.get('quantile_dot_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A', 'B'], [1, 2]), { ...cfg, columns: { value: 'value', group: 'group' } }, theme()) as EChartsOption;
    expect(((opt.yAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter)(1)).toBe('B');
    expect(((opt.yAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter)(9)).toBe('');
  });

  it('uses Ungrouped for finite values without a matching group label', () => {
    const opt = (chartRegistry.get('quantile_dot_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1]), { ...cfg, columns: { value: 'value', group: 'group' } }, theme()) as EChartsOption;
    const series = (opt.series as ScatterSeries[])[0];
    expect(series.data).toHaveLength(5);
    expect(((opt.yAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter)(0)).toBe('Ungrouped');
  });

  it('drops non-finite values in grouped mode', () => {
    const opt = (chartRegistry.get('quantile_dot_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A', 'B'], [NaN, 2]), { ...cfg, columns: { value: 'value', group: 'group' } }, theme()) as EChartsOption;
    const series = (opt.series as ScatterSeries[])[0];
    expect(series.data).toHaveLength(5);
    expect(((opt.yAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter)(0)).toBe('B');
  });

  it('renders an empty state when no finite values exist', () => {
    const el = chartRegistry.get('quantile_dot_plot')!.createRenderer().render(view([], [NaN]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('renders an empty state when assigned columns are missing', () => {
    const el = chartRegistry.get('quantile_dot_plot')!.createRenderer().render(view(['A'], [1]), { ...cfg, columns: { value: 'missing', group: 'also_missing' } }, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });
});
