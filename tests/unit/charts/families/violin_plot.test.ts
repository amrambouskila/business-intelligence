import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/violin_plot';
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
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { group: groups, value: values },
    columns: [
      { name: 'group', type: 'category', nullable: false, uniqueCount: groups.length, nullCount: 0 },
      { name: 'value', type: 'float', nullable: false, uniqueCount: values.length, nullCount: 0 },
    ],
    rowCount: Math.max(groups.length, values.length),
  };
}

type ViolinSeries = { name: string; type: string; data: Array<[number, number]>; showSymbol: boolean; lineStyle: { color: string; width: number } };

describe('violin_plot registration', () => {
  it('registers under the distribution family', () => {
    const def = chartRegistry.get('violin_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.optionalColumns).toEqual([{ role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' }]);
  });
});

describe('violin_plot buildOption', () => {
  it('builds mirrored density outlines for one ungrouped distribution', () => {
    const cfg: ChartConfig = { chartType: 'violin_plot', columns: { value: 'value' }, options: {} };
    const opt = (chartRegistry.get('violin_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1, 2, 3, 4, 5]), cfg, theme()) as EChartsOption;
    const series = opt.series as ViolinSeries[];
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ name: 'All left', type: 'line', showSymbol: false, lineStyle: { color: '#f00', width: 2 } });
    expect(series[1]).toMatchObject({ name: 'All right', type: 'line', showSymbol: false });
    expect(series[0].data).toHaveLength(40);
    expect(series[1].data).toHaveLength(40);
    expect((opt.xAxis as Record<string, unknown>).min).toBe(-0.5);
    expect((opt.xAxis as Record<string, unknown>).max).toBe(0.5);
  });

  it('builds one mirrored pair per first-seen group and drops non-finite values', () => {
    const cfg: ChartConfig = { chartType: 'violin_plot', columns: { value: 'value', group: 'group' }, options: {} };
    const opt = (chartRegistry.get('violin_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['B', 'A', 'B', 'A'], [1, 10, 2, NaN]), cfg, theme()) as EChartsOption;
    const series = opt.series as ViolinSeries[];
    expect(series.map((s) => s.name)).toEqual(['B left', 'B right', 'A left', 'A right']);
    expect(series[2].lineStyle.color).toBe('#0f0');
  });

  it('uses Ungrouped when an optional group role points at a missing column', () => {
    const cfg: ChartConfig = { chartType: 'violin_plot', columns: { value: 'value', group: 'missing_group' }, options: {} };
    const opt = (chartRegistry.get('violin_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1, 2]), cfg, theme()) as EChartsOption;
    expect((opt.series as ViolinSeries[]).map((s) => s.name)).toEqual(['Ungrouped left', 'Ungrouped right']);
  });

  it('renders the empty state when no finite values exist', () => {
    const renderer = chartRegistry.get('violin_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'violin_plot', columns: { value: 'value' }, options: {} };
    expect((renderer.render(view([], [NaN]), cfg, theme()).props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const renderer = chartRegistry.get('violin_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'violin_plot', columns: { value: 'missing_value' }, options: {} };
    expect((renderer.render(view([], [1]), cfg, theme()).props as { message: string }).message).toBe('No numeric values to chart');
  });
});
