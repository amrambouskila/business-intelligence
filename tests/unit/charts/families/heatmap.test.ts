import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/heatmap';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('heatmap registration', () => {
  it('registers under type "heatmap" with the matrix family', () => {
    const def = chartRegistry.get('heatmap');
    expect(def).toBeDefined();
    expect(def!.family).toBe('matrix');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('heatmap buildOption', () => {
  const def = () => chartRegistry.get('heatmap')!;

  const matrixView = (): DataView => ({
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      row: ['r1', 'r2', 'r1', 'r2'],
      col: ['c1', 'c1', 'c2', 'c2'],
      value: [10, 20, 30, 40],
    },
    columns: [
      { name: 'row', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'col', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  });

  const cfg = (): ChartConfig => ({
    chartType: 'heatmap', columns: { row: 'row', col: 'col', value: 'value' }, options: {},
  });

  it('builds heatmap series with [colIndex, rowIndex, value] cells and category axes', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(matrixView(), cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: Array<[number, number, number]> }>;
    expect(series[0].type).toBe('heatmap');
    expect(series[0].data).toEqual([[0, 0, 10], [0, 1, 20], [1, 0, 30], [1, 1, 40]]);
    expect((opt.xAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['c1', 'c2']);
    expect((opt.yAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.yAxis as { data: string[] }).data).toEqual(['r1', 'r2']);
  });

  it('derives visualMap min/max from finite values and uses the sequential palette', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(matrixView(), cfg(), theme()) as EChartsOption;
    const vm = opt.visualMap as { min: number; max: number; inRange: { color: string[] }; textStyle: { color: string } };
    expect(vm.min).toBe(10);
    expect(vm.max).toBe(40);
    expect(vm.inRange.color).toEqual(['#000', '#fff']);
    expect(vm.textStyle.color).toBe('#666');
  });

  it('derives min/max regardless of value order', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { row: ['r1', 'r2'], col: ['c1', 'c1'], value: [40, 10] },
      columns: [
        { name: 'row', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'col', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'value', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg(), theme()) as EChartsOption;
    const vm = opt.visualMap as { min: number; max: number };
    expect(vm.min).toBe(10);
    expect(vm.max).toBe(40);
  });

  it('falls back to visualMap min:0 max:1 and empty data when no finite values exist', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const config: ChartConfig = { chartType: 'heatmap', columns: { row: 'nope_r', col: 'nope_c', value: 'nope_v' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
    const vm = opt.visualMap as { min: number; max: number };
    expect(vm.min).toBe(0);
    expect(vm.max).toBe(1);
  });
});
