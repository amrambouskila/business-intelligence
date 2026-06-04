import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/dot_plot';
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

type DotSeries = { type: string; data: Array<[number, string]>; symbol: string; symbolSize: number; itemStyle: { color: string; opacity: number } };

describe('dot_plot registration', () => {
  it('registers under the distribution family with an optional group role', () => {
    const def = chartRegistry.get('dot_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.optionalColumns).toEqual([{ role: 'group', acceptedTypes: ['category', 'text'], label: 'Group' }]);
  });
});

describe('dot_plot buildOption', () => {
  it('renders all finite values under the All label when no group role is assigned', () => {
    const cfg: ChartConfig = { chartType: 'dot_plot', columns: { value: 'value' }, options: {} };
    const opt = (chartRegistry.get('dot_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1, 2, NaN, 3]), cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['All']);
    const series = (opt.series as DotSeries[])[0];
    expect(series).toMatchObject({
      type: 'scatter',
      data: [[1, 'All'], [2, 'All'], [3, 'All']],
      symbol: 'circle',
      symbolSize: 9,
      itemStyle: { color: '#f00', opacity: 0.8 },
    });
  });

  it('uses group labels in first-seen order and fills missing labels as Ungrouped', () => {
    const cfg: ChartConfig = { chartType: 'dot_plot', columns: { value: 'value', group: 'group' }, options: {} };
    const opt = (chartRegistry.get('dot_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['B', 'A'], [1, 2, 3]), cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['B', 'A', 'Ungrouped']);
    expect(((opt.series as DotSeries[])[0]).data).toEqual([[1, 'B'], [2, 'A'], [3, 'Ungrouped']]);
  });

  it('uses Ungrouped when an optional group role points at a missing column', () => {
    const cfg: ChartConfig = { chartType: 'dot_plot', columns: { value: 'value', group: 'missing_group' }, options: {} };
    const opt = (chartRegistry.get('dot_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1]), cfg, theme()) as EChartsOption;
    expect(((opt.series as DotSeries[])[0]).data).toEqual([[1, 'Ungrouped']]);
  });

  it('renders the empty state when no finite values exist', () => {
    const renderer = chartRegistry.get('dot_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'dot_plot', columns: { value: 'value' }, options: {} };
    expect((renderer.render(view([], [NaN, Infinity]), cfg, theme()).props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const renderer = chartRegistry.get('dot_plot')!.createRenderer();
    const cfg: ChartConfig = { chartType: 'dot_plot', columns: { value: 'missing_value' }, options: {} };
    expect((renderer.render(view([], [1]), cfg, theme()).props as { message: string }).message).toBe('No numeric values to chart');
  });
});
