import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/clustermap';
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

const cfg: ChartConfig = { chartType: 'clustermap', columns: { row: 'row', col: 'col', value: 'value' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      row: ['r1', 'r2', 'r1', 'r2'],
      col: ['c1', 'c1', 'c2', 'c2'],
      value: [1, 10, 2, 20],
    },
    columns: [
      { name: 'row', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'col', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  };
}

describe('clustermap', () => {
  const renderer = () => chartRegistry.get('clustermap')!.createRenderer() as EChartsBaseRenderer;

  it('registers row, col, and value roles', () => {
    expect(chartRegistry.get('clustermap')!.requiredColumns.map((c) => c.role)).toEqual(['row', 'col', 'value']);
  });

  it('orders rows and columns by descending mean intensity', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['r2', 'r1']);
    expect((opt.xAxis as { data: string[] }).data).toEqual(['c2', 'c1']);
    const series = opt.series as Array<{ data: Array<[number, number, number]> }>;
    expect(series[0].data).toEqual([[1, 1, 1], [1, 0, 10], [0, 1, 2], [0, 0, 20]]);
  });

  it('uses name tiebreaks and empty-state handling', () => {
    const tied = view();
    tied.columnArrays.value = [1, 1, 1, 1];
    const opt = renderer().buildOption(tied, cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['r1', 'r2']);

    tied.columnArrays.value = [NaN];
    const el = chartRegistry.get('clustermap')!.createRenderer().render(tied, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No clustermap values to chart');
  });

  it('keeps categories with no finite cells last and handles missing role columns', () => {
    const sparse = view();
    sparse.columnArrays.value = [5, NaN, 6, NaN];
    const opt = renderer().buildOption(sparse, cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['r1', 'r2']);

    const missing = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((missing.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
