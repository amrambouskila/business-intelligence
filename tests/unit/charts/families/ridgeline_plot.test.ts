import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/ridgeline_plot';
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

type RidgeSeries = {
  name: string;
  type: string;
  data: Array<[number, number]>;
  showSymbol: boolean;
  smooth: boolean;
  lineStyle: { color: string; width: number };
  areaStyle: { color: string; opacity: number };
};

describe('ridgeline_plot registration', () => {
  it('registers under the distribution family with group/value roles', () => {
    const def = chartRegistry.get('ridgeline_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['group', 'value']);
  });
});

describe('ridgeline_plot buildOption', () => {
  it('builds one scaled density ridge per first-seen group', () => {
    const cfg: ChartConfig = { chartType: 'ridgeline_plot', columns: { group: 'group', value: 'value' }, options: {} };
    const opt = (chartRegistry.get('ridgeline_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['B', 'A', 'B', 'A', 'A'], [1, 10, 2, 11, NaN]), cfg, theme()) as EChartsOption;
    const series = opt.series as RidgeSeries[];
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      name: 'B',
      type: 'line',
      showSymbol: false,
      smooth: true,
      lineStyle: { color: '#f00', width: 2 },
      areaStyle: { color: '#f00', opacity: 0.22 },
    });
    expect(series[1].name).toBe('A');
    expect(series[1].lineStyle.color).toBe('#0f0');
    expect(series[0].data).toHaveLength(50);
    expect((opt.yAxis as Record<string, unknown>).max).toBe(2);
  });

  it('uses Ungrouped when a finite value has no group value', () => {
    const cfg: ChartConfig = { chartType: 'ridgeline_plot', columns: { group: 'group', value: 'value' }, options: {} };
    const opt = (chartRegistry.get('ridgeline_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1, 2]), cfg, theme()) as EChartsOption;
    expect((opt.series as RidgeSeries[])[0].name).toBe('Ungrouped');
  });

  it('renders the empty state when grouped values are unavailable', () => {
    const renderer = chartRegistry.get('ridgeline_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'ridgeline_plot', columns: { group: 'missing_group', value: 'value' }, options: {} };
    expect((renderer.render(view(['A'], [1]), cfg, theme()).props as { message: string }).message).toBe('No grouped numeric values to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const renderer = chartRegistry.get('ridgeline_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'ridgeline_plot', columns: { group: 'group', value: 'missing_value' }, options: {} };
    expect((renderer.render(view(['A'], [1]), cfg, theme()).props as { message: string }).message).toBe('No grouped numeric values to chart');
  });
});
