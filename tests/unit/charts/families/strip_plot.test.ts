import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/strip_plot';
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

type StripSeries = { type: string; data: Array<[number, string]>; symbolSize: number; itemStyle: { color: string; opacity: number } };

describe('strip_plot registration', () => {
  it('registers under the distribution family with group/value roles', () => {
    const def = chartRegistry.get('strip_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['group', 'value']);
  });
});

describe('strip_plot buildOption', () => {
  it('renders grouped finite points and preserves first-seen label order', () => {
    const cfg: ChartConfig = { chartType: 'strip_plot', columns: { group: 'group', value: 'value' }, options: {} };
    const opt = (chartRegistry.get('strip_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['B', 'A', 'B'], [1, NaN, 3]), cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['B']);
    const series = (opt.series as StripSeries[])[0];
    expect(series).toMatchObject({ type: 'scatter', data: [[1, 'B'], [3, 'B']], symbolSize: 7 });
    expect(series.itemStyle).toEqual({ color: '#f00', opacity: 0.65 });
  });

  it('renders the empty state when grouped values are unavailable', () => {
    const renderer = chartRegistry.get('strip_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'strip_plot', columns: { group: 'missing_group', value: 'value' }, options: {} };
    expect((renderer.render(view(['A'], [1]), cfg, theme()).props as { message: string }).message).toBe('No grouped numeric values to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const renderer = chartRegistry.get('strip_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'strip_plot', columns: { group: 'group', value: 'missing_value' }, options: {} };
    expect((renderer.render(view(['A'], [1]), cfg, theme()).props as { message: string }).message).toBe('No grouped numeric values to chart');
  });
});
