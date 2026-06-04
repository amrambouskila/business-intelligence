import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/annotated_heatmap';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

type HeatmapLabel = {
  show: boolean;
  color: string;
  formatter: (params: { value: [number, number, number] }) => string;
};
type HeatmapSeries = { type: string; data: Array<[number, number, number]>; label: HeatmapLabel };

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
  chartType: 'annotated_heatmap', columns: { row: 'row', col: 'col', value: 'value' }, options: {},
});

const build = (dv: DataView, config: ChartConfig): EChartsOption =>
  (chartRegistry.get('annotated_heatmap')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme());

describe('annotated_heatmap registration', () => {
  it('registers under type "annotated_heatmap" with the matrix family', () => {
    const def = chartRegistry.get('annotated_heatmap');
    expect(def).toBeDefined();
    expect(def!.family).toBe('matrix');
    expect(def!.renderer).toBe('echarts');
  });

  it('declares row, col, and value as required columns', () => {
    const def = chartRegistry.get('annotated_heatmap')!;
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['row', 'col', 'value']);
  });
});

describe('annotated_heatmap buildOption', () => {
  it('builds heatmap series with [colIndex, rowIndex, value] cells and category axes', () => {
    const opt = build(matrixView(), cfg());
    const series = opt.series as HeatmapSeries[];
    expect(series[0].type).toBe('heatmap');
    expect(series[0].data).toEqual([[0, 0, 10], [0, 1, 20], [1, 0, 30], [1, 1, 40]]);
    expect((opt.xAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['c1', 'c2']);
    expect((opt.yAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.yAxis as { data: string[] }).data).toEqual(['r1', 'r2']);
  });

  it('shows in-cell labels in the foreground color formatted to the cell value', () => {
    const opt = build(matrixView(), cfg());
    const label = (opt.series as HeatmapSeries[])[0].label;
    expect(label.show).toBe(true);
    expect(label.color).toBe('#fff');
    expect(label.formatter({ value: [1, 0, 30] })).toBe('30');
  });

  it('derives visualMap min/max from finite values and uses the sequential palette', () => {
    const opt = build(matrixView(), cfg());
    const vm = opt.visualMap as { min: number; max: number; inRange: { color: string[] }; textStyle: { color: string } };
    expect(vm.min).toBe(10);
    expect(vm.max).toBe(40);
    expect(vm.inRange.color).toEqual(['#000', '#fff']);
    expect(vm.textStyle.color).toBe('#666');
  });

  it('keeps non-finite cell values out of the visualMap range while leaving cells in place', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        row: ['r1', 'r2', 'r1'],
        col: ['c1', 'c1', 'c2'],
        value: [40, NaN, 10],
      },
      columns: [
        { name: 'row', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'col', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'value', type: 'float', nullable: true, uniqueCount: 2, nullCount: 1 },
      ],
      rowCount: 3,
    };
    const opt = build(dv, cfg());
    const vm = opt.visualMap as { min: number; max: number };
    expect(vm.min).toBe(10);
    expect(vm.max).toBe(40);
    const series = opt.series as HeatmapSeries[];
    expect(series[0].data).toHaveLength(3);
  });

  it('produces empty cells and a default visualMap when all role columns are absent', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const config: ChartConfig = { chartType: 'annotated_heatmap', columns: { row: 'gone_r', col: 'gone_c', value: 'gone_v' }, options: {} };
    const opt = build(dv, config);
    const series = opt.series as HeatmapSeries[];
    expect(series[0].data).toEqual([]);
    const vm = opt.visualMap as { min: number; max: number };
    expect(vm.min).toBe(0);
    expect(vm.max).toBe(1);
  });

  it('falls back to visualMap min:0 max:1 when no finite values exist', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { row: ['r1'], col: ['c1'], value: [NaN] },
      columns: [
        { name: 'row', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'col', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'value', type: 'float', nullable: true, uniqueCount: 0, nullCount: 1 },
      ],
      rowCount: 1,
    };
    const opt = build(dv, cfg());
    const vm = opt.visualMap as { min: number; max: number };
    expect(vm.min).toBe(0);
    expect(vm.max).toBe(1);
  });
});

describe('annotated_heatmap empty state', () => {
  it('reports empty when no finite values exist', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { row: ['r1', 'r2'], col: ['c1', 'c2'], value: [NaN, Infinity] },
      columns: [
        { name: 'row', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'col', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'value', type: 'float', nullable: true, uniqueCount: 0, nullCount: 2 },
      ],
      rowCount: 2,
    };
    const el = chartRegistry.get('annotated_heatmap')!.createRenderer().render(dv, cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No matrix values to chart');
  });

  it('reports empty when the value column is missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const config: ChartConfig = { chartType: 'annotated_heatmap', columns: { row: 'r', col: 'c', value: 'missing' }, options: {} };
    const el = chartRegistry.get('annotated_heatmap')!.createRenderer().render(dv, config, theme());
    expect((el.props as { message?: string }).message).toBe('No matrix values to chart');
  });
});
