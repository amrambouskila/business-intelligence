import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/andrews_curves';
import '@/charts/families/relationships/biplot';
import '@/charts/families/relationships/correlation_heatmap';
import '@/charts/families/relationships/covariance_heatmap';
import '@/charts/families/relationships/parallel_coordinates';
import '@/charts/families/relationships/pair_plot';
import '@/charts/families/relationships/radviz';
import '@/charts/families/relationships/scatter_matrix';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#999',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#111', '#eee'], divergingScale: ['#00f', '#fff', '#f00'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    rowCount: 4,
    columns: [],
    columnArrays: {
      f1: [1, 2, 3, 'bad'],
      f2: [2, 4, 6, 8],
      f3: [3, 2, 1, 0],
      pc1: [-1, 0, 1, 2],
      pc2: [1, 0, -1, 2],
      loading_x: [0.8, -0.4, 0.1],
      loading_y: [0.2, 0.6, -0.5],
    },
  };
}

function cfg(chartType: string): ChartConfig {
  return { chartType, columns: { f1: 'f1', f2: 'f2', f3: 'f3', pc1: 'pc1', pc2: 'pc2', loading_x: 'loading_x', loading_y: 'loading_y' }, options: {} };
}

function renderer(type: string): EChartsBaseRenderer {
  return chartRegistry.get(type)!.createRenderer() as EChartsBaseRenderer;
}

describe('relationship multivariate chart registrations', () => {
  it('registers the eight ECharts multivariate relationship charts', () => {
    expect(['biplot', 'andrews_curves', 'radviz', 'parallel_coordinates', 'pair_plot', 'scatter_matrix', 'correlation_heatmap', 'covariance_heatmap'].map((type) => chartRegistry.get(type)?.family)).toEqual([
      'relationships',
      'relationships',
      'relationships',
      'relationships',
      'relationships',
      'relationships',
      'relationships',
      'relationships',
    ]);
  });
});

describe('relationship multivariate charts', () => {
  it('builds biplot score and loading-vector series', () => {
    const opt = renderer('biplot').buildOption(view(), cfg('biplot'), theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; type: string; data: unknown[] }>;
    expect(series.map((item) => item.name)).toEqual(['Scores', 'Loadings']);
    expect(series[0].data).toEqual([[-1, 1], [0, 0], [1, -1], [2, 2]]);
    expect(series[1].type).toBe('lines');
  });

  it('builds Andrews curve line series from finite rows', () => {
    const opt = renderer('andrews_curves').buildOption(view(), cfg('andrews_curves'), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: unknown[] }>;
    expect(series).toHaveLength(3);
    expect(series[0].type).toBe('line');
    expect(series[0].data).toHaveLength(41);
  });

  it('builds RadViz projected rows and anchors', () => {
    const opt = renderer('radviz').buildOption(view(), cfg('radviz'), theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; type: string; data: unknown[] }>;
    expect(series.map((item) => item.name)).toEqual(['Projected rows', 'Feature anchors']);
    expect(series[0].data).toHaveLength(3);
    expect(series[1].data).toHaveLength(3);
  });

  it('builds parallel coordinate axes and rows', () => {
    const opt = renderer('parallel_coordinates').buildOption(view(), cfg('parallel_coordinates'), theme()) as EChartsOption;
    expect((opt.parallelAxis as unknown[])).toHaveLength(3);
    expect((opt.series as Array<{ type: string; data: unknown[] }>)[0].type).toBe('parallel');
  });

  it('builds a 3x3 scatter matrix', () => {
    const opt = renderer('scatter_matrix').buildOption(view(), cfg('scatter_matrix'), theme()) as EChartsOption;
    expect((opt.grid as unknown[])).toHaveLength(9);
    expect((opt.series as Array<{ type: string; data: unknown[] }>)).toHaveLength(9);
  });

  it('builds pair plot histograms on the diagonal and scatter cells off diagonal', () => {
    const opt = renderer('pair_plot').buildOption(view(), cfg('pair_plot'), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: unknown[] }>;
    expect((opt.grid as unknown[])).toHaveLength(9);
    expect(series).toHaveLength(9);
    expect(series[0].type).toBe('bar');
    expect(series[1].type).toBe('scatter');
    expect(series[4].type).toBe('bar');
    expect(series[8].type).toBe('bar');
  });

  it('builds correlation and covariance heatmaps with label formatters', () => {
    const corr = renderer('correlation_heatmap').buildOption(view(), cfg('correlation_heatmap'), theme()) as EChartsOption;
    const cov = renderer('covariance_heatmap').buildOption(view(), cfg('covariance_heatmap'), theme()) as EChartsOption;
    const corrSeries = (corr.series as Array<{ data: unknown[]; label: { formatter: (arg: { value: [number, number, number] }) => string } }>)[0];
    const covSeries = (cov.series as Array<{ data: unknown[]; label: { formatter: (arg: { value: [number, number, number] }) => string } }>)[0];
    expect(corrSeries.data).toHaveLength(9);
    expect(covSeries.data).toHaveLength(9);
    expect(corrSeries.label.formatter({ value: [0, 0, 0.123] })).toBe('0.12');
    expect(covSeries.label.formatter({ value: [0, 0, 1.23] })).toBe('1.2');
    expect(corrSeries.label.formatter({} as { value: [number, number, number] })).toBe('0.00');
    expect(covSeries.label.formatter({} as { value: [number, number, number] })).toBe('0.0');
  });

  it('shows chart-specific empty states when required finite rows are absent', () => {
    const empty = { ...view(), columnArrays: {}, rowCount: 0 };
    expect((chartRegistry.get('biplot')!.createRenderer().render(empty, cfg('biplot'), theme()).props as { message?: string }).message).toBe('No PCA scores to chart');
    expect((chartRegistry.get('andrews_curves')!.createRenderer().render(empty, cfg('andrews_curves'), theme()).props as { message?: string }).message).toBe('No numeric feature rows to transform');
    expect((chartRegistry.get('radviz')!.createRenderer().render(empty, cfg('radviz'), theme()).props as { message?: string }).message).toBe('No numeric feature rows to project');
    expect((chartRegistry.get('parallel_coordinates')!.createRenderer().render(empty, cfg('parallel_coordinates'), theme()).props as { message?: string }).message).toBe('No numeric feature rows to chart');
    expect((chartRegistry.get('pair_plot')!.createRenderer().render(empty, cfg('pair_plot'), theme()).props as { message?: string }).message).toBe('No numeric feature rows to compare');
    expect((chartRegistry.get('scatter_matrix')!.createRenderer().render(empty, cfg('scatter_matrix'), theme()).props as { message?: string }).message).toBe('No numeric feature rows to compare');
    expect((chartRegistry.get('correlation_heatmap')!.createRenderer().render(empty, cfg('correlation_heatmap'), theme()).props as { message?: string }).message).toBe('No numeric feature rows to correlate');
    expect((chartRegistry.get('covariance_heatmap')!.createRenderer().render(empty, cfg('covariance_heatmap'), theme()).props as { message?: string }).message).toBe('No numeric feature rows to covary');
  });
});
