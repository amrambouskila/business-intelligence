import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/tile_map';
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

const cfg: ChartConfig = { chartType: 'tile_map', columns: { row: 'row', col: 'col', value: 'value' }, options: {} };

const view = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { row: ['r1', 'r2'], col: ['c1', 'c2'], value: [5, 8] },
  columns: [
    { name: 'row', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
    { name: 'col', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
    { name: 'value', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
  ],
  rowCount: 2,
});

describe('tile_map', () => {
  const renderer = () => chartRegistry.get('tile_map')!.createRenderer() as EChartsBaseRenderer;

  it('registers row, col, and value roles', () => {
    expect(chartRegistry.get('tile_map')!.requiredColumns.map((c) => c.role)).toEqual(['row', 'col', 'value']);
  });

  it('renders bordered heatmap tiles', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number, number]>; itemStyle: { borderColor: string; borderWidth: number } }>;
    expect(series[0].data).toEqual([[0, 0, 5], [1, 1, 8]]);
    expect(series[0].itemStyle).toEqual({ borderColor: '#000', borderWidth: 2 });
    expect((opt.visualMap as { min: number; max: number }).min).toBe(5);
  });

  it('renders an empty state when no tile values exist', () => {
    const empty = view();
    empty.columnArrays.value = [NaN];
    const el = chartRegistry.get('tile_map')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No tile values to chart');
  });

  it('falls back to empty cells when role columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
