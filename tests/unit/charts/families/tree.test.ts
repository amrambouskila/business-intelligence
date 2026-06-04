import { describe, it, expect } from 'vitest';
import '@/charts/families/hierarchical/tree';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { ColumnMeta, DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

interface TreeNode {
  name: string;
  value: number;
  children?: TreeNode[];
}

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const renderer = () => chartRegistry.get('tree')!.createRenderer() as EChartsBaseRenderer;

const col = (name: string, type: ColumnMeta['type'], uniqueCount: number): ColumnMeta => ({
  name, type, nullable: false, uniqueCount, nullCount: 0,
});

const cfg = (withValue = false): ChartConfig => ({
  chartType: 'tree',
  columns: withValue ? { id: 'id', parent: 'parent', value: 'value' } : { id: 'id', parent: 'parent' },
  options: {},
});

const rootedView = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { id: ['a', 'b', 'c'], parent: [null, 'a', 'a'] },
  columns: [col('id', 'category', 3), col('parent', 'category', 1)],
  rowCount: 3,
});

const seriesData = (opt: EChartsOption): TreeNode[] =>
  (opt.series as Array<{ data: TreeNode[] }>)[0].data;

describe('tree registration', () => {
  it('registers under type "tree" with the hierarchical family and echarts renderer', () => {
    const def = chartRegistry.get('tree');
    expect(def).toBeDefined();
    expect(def!.family).toBe('hierarchical');
    expect(def!.renderer).toBe('echarts');
  });

  it('declares id/parent as required columns, value as optional, and hierarchy/generic shapes', () => {
    const def = chartRegistry.get('tree')!;
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['id', 'parent']);
    expect(def.optionalColumns!.map((c) => c.role)).toEqual(['value']);
    expect(def.compatibleShapes).toEqual(['hierarchy', 'generic']);
  });
});

describe('tree buildOption', () => {
  it('builds a tree series rooting "a" with two children when value is unassigned (defaults to 1)', () => {
    const opt = renderer().buildOption(rootedView(), cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{
      type: string;
      layout: string;
      expandAndCollapse: boolean;
      label: { color: string };
      lineStyle: { color: string };
    }>;
    expect(series[0].type).toBe('tree');
    expect(series[0].layout).toBe('orthogonal');
    expect(series[0].expandAndCollapse).toBe(true);
    expect(series[0].label.color).toBe('#fff');
    expect(series[0].lineStyle.color).toBe('#333');
    expect(seriesData(opt)).toEqual([
      {
        name: 'a',
        value: 1,
        children: [
          { name: 'b', value: 1 },
          { name: 'c', value: 1 },
        ],
      },
    ]);
  });

  it('uses the assigned value column and emits an item tooltip with no axes or grid', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { id: ['a', 'b', 'c'], parent: [null, 'a', 'a'], value: [7, 3, 9] },
      columns: [col('id', 'category', 3), col('parent', 'category', 1), col('value', 'integer', 3)],
      rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg(true), theme()) as EChartsOption;
    expect((opt.tooltip as { trigger: string }).trigger).toBe('item');
    expect(opt.xAxis).toBeUndefined();
    expect(opt.yAxis).toBeUndefined();
    expect(opt.grid).toBeUndefined();
    expect(seriesData(opt)).toEqual([
      {
        name: 'a',
        value: 7,
        children: [
          { name: 'b', value: 3 },
          { name: 'c', value: 9 },
        ],
      },
    ]);
  });

  it('coerces non-finite values to 0 and stringifies non-string ids', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { id: [1, 2], parent: [null, 1], value: [Number.NaN, 5] },
      columns: [col('id', 'integer', 2), col('parent', 'integer', 1), col('value', 'float', 2)],
      rowCount: 2,
    };
    const opt = renderer().buildOption(dv, cfg(true), theme()) as EChartsOption;
    expect(seriesData(opt)).toEqual([{ name: '1', value: 0, children: [{ name: '2', value: 5 }] }]);
  });

  it('falls back to empty arrays when the assigned columns are absent from the view', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(dv, cfg(true), theme()) as EChartsOption;
    expect(seriesData(opt)).toEqual([]);
  });
});

describe('tree empty guard', () => {
  it('renders the empty state with the chart-specific message when no rows produce a tree', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = renderer().render(dv, cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No hierarchy to chart');
  });

  it('renders a chart when the tree has at least one node', () => {
    const el = renderer().render(rootedView(), cfg(), theme());
    expect(el.props).toHaveProperty('option');
  });
});
