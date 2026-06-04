import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/joint_plot';
import '@/charts/families/relationships/hexbin_plot';
import '@/charts/families/relationships/two_d_density_plot';
import '@/charts/families/relationships/contour_plot';
import '@/charts/families/relationships/filled_contour';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#999',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#111', '#eee'], divergingScale: ['#00f', '#fff', '#f00'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    rowCount: 5,
    columnArrays: {
      x: [0, 0.2, 0.9, 1, 'bad'],
      y: [0, 0.2, 0.9, 1, 1],
      z: [2, 4, 8, 10, 12],
    },
    columns: [],
  };
}

function cfg(chartType: string): ChartConfig {
  return { chartType, columns: { x: 'x', y: 'y', z: 'z' }, options: {} };
}

function renderer(type: string): EChartsBaseRenderer {
  return chartRegistry.get(type)!.createRenderer() as EChartsBaseRenderer;
}

describe('relationship density chart registrations', () => {
  it('registers the five ECharts relationship density charts', () => {
    expect(['joint_plot', 'hexbin_plot', 'two_d_density_plot', 'contour_plot', 'filled_contour'].map((type) => chartRegistry.get(type)?.family)).toEqual([
      'relationships',
      'relationships',
      'relationships',
      'relationships',
      'relationships',
    ]);
  });
});

describe('joint_plot', () => {
  it('builds scatter plus marginal histograms', () => {
    const opt = renderer('joint_plot').buildOption(view(), cfg('joint_plot'), theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; type: string; data: unknown[]; itemStyle?: { color: string } }>;
    expect(series.map((item) => item.name)).toEqual(['Points', 'X distribution', 'Y distribution']);
    expect(series[0].data).toEqual([[0, 0], [0.2, 0.2], [0.9, 0.9], [1, 1]]);
    expect(series[1].type).toBe('bar');
    expect(series[2].type).toBe('bar');
    expect(series[0].itemStyle?.color).toBe('#f00');
  });

  it('shows an empty state with no finite x/y pairs', () => {
    const el = chartRegistry.get('joint_plot')!.createRenderer().render({ ...view(), columnArrays: { x: [NaN], y: ['bad'], z: [1] }, rowCount: 1 }, cfg('joint_plot'), theme());
    expect((el.props as { message?: string }).message).toBe('No x/y points to chart');
  });
});

describe('hexbin_plot', () => {
  it('builds hexagonal scatter bins with a themed sequential visual map', () => {
    const opt = renderer('hexbin_plot').buildOption(view(), cfg('hexbin_plot'), theme()) as EChartsOption;
    const series = opt.series as Array<{ symbol: string; data: number[][]; symbolSize: (point: [number, number, number]) => number }>;
    expect(series[0].symbol).toContain('path://');
    expect(series[0].data.length).toBeGreaterThan(0);
    expect(series[0].symbolSize([0, 0, 1])).toBeGreaterThan(8);
    expect((opt.visualMap as { inRange: { color: string[] } }).inRange.color).toEqual(['#111', '#eee']);
  });

  it('shows an empty state with no finite x/y pairs', () => {
    const el = chartRegistry.get('hexbin_plot')!.createRenderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg('hexbin_plot'), theme());
    expect((el.props as { message?: string }).message).toBe('No x/y points to bin');
  });

  it('keeps hex symbols at the base size when there are no computed bins', () => {
    const opt = renderer('hexbin_plot').buildOption({ ...view(), columnArrays: {}, rowCount: 0 }, cfg('hexbin_plot'), theme()) as EChartsOption;
    const series = opt.series as Array<{ symbolSize: (point: [number, number, number]) => number }>;
    expect(series[0].symbolSize([0, 0, 1])).toBe(8);
  });
});

describe('two_d_density_plot', () => {
  it('builds a binned heatmap density grid', () => {
    const opt = renderer('two_d_density_plot').buildOption(view(), cfg('two_d_density_plot'), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: number[][] }>;
    expect(series[0].type).toBe('heatmap');
    expect(series[0].data.length).toBeGreaterThan(0);
    expect((opt.xAxis as { data: string[] }).data.length).toBe(18);
    expect((opt.yAxis as { data: string[] }).data.length).toBe(18);
  });

  it('shows an empty state with no finite x/y pairs', () => {
    const el = chartRegistry.get('two_d_density_plot')!.createRenderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg('two_d_density_plot'), theme());
    expect((el.props as { message?: string }).message).toBe('No x/y points to chart');
  });
});

describe('contour_plot and filled_contour', () => {
  it('builds discrete contour bands from gridded mean z values', () => {
    const opt = renderer('contour_plot').buildOption(view(), cfg('contour_plot'), theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; type: string; itemStyle?: { borderColor?: string; borderWidth?: number } }>;
    expect(series[0].name).toBe('Contour bands');
    expect(series[0].type).toBe('heatmap');
    expect(series[0].itemStyle).toEqual({ borderColor: '#000', borderWidth: 1 });
    expect((opt.visualMap as { type: string; inRange: { color: string[] } }).type).toBe('piecewise');
  });

  it('builds filled contour bands with continuous diverging color', () => {
    const opt = renderer('filled_contour').buildOption(view(), cfg('filled_contour'), theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; type: string; itemStyle?: { borderWidth?: number } }>;
    expect(series[0].name).toBe('Filled contours');
    expect(series[0].type).toBe('heatmap');
    expect(series[0].itemStyle).toEqual({ borderWidth: 0 });
    expect((opt.visualMap as { calculable: boolean; inRange: { color: string[] } }).calculable).toBe(true);
  });

  it('shows empty states when no finite x/y/z triples exist', () => {
    const emptyView = { ...view(), columnArrays: { x: [1], y: [2], z: ['bad'] }, rowCount: 1 };
    expect((chartRegistry.get('contour_plot')!.createRenderer().render(emptyView, cfg('contour_plot'), theme()).props as { message?: string }).message).toBe('No x/y/z grid values to chart');
    expect((chartRegistry.get('filled_contour')!.createRenderer().render(emptyView, cfg('filled_contour'), theme()).props as { message?: string }).message).toBe('No x/y/z grid values to chart');
  });
});
