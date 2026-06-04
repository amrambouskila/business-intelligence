import { describe, it, expect } from 'vitest';
import '@/charts/families/hierarchical/treemap';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
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
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('treemap registration', () => {
  it('registers under type "treemap" with the hierarchical family', () => {
    const def = chartRegistry.get('treemap');
    expect(def).toBeDefined();
    expect(def!.family).toBe('hierarchical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('treemap buildOption', () => {
  const def = () => chartRegistry.get('treemap')!;

  const hierarchyView = (): DataView => ({
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      id: ['root', 'a', 'b', 'a1'],
      parent: ['', 'root', 'root', 'a'],
      value: [0, 10, 20, 5],
    },
    columns: [
      { name: 'id', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'parent', type: 'category', nullable: true, uniqueCount: 3, nullCount: 1 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  });

  const cfg = (): ChartConfig => ({
    chartType: 'treemap', columns: { id: 'id', parent: 'parent', value: 'value' }, options: {},
  });

  it('builds a treemap series with the nested tree from id/parent/value', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(hierarchyView(), cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: TreeNode[]; label: { color: string } }>;
    expect(series[0].type).toBe('treemap');
    expect(series[0].data).toEqual([
      {
        name: 'root',
        value: 0,
        children: [
          { name: 'a', value: 10, children: [{ name: 'a1', value: 5 }] },
          { name: 'b', value: 20 },
        ],
      },
    ]);
  });

  it('themes the label color and uses an item tooltip with no axes/grid', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(hierarchyView(), cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ label: { color: string } }>;
    expect(series[0].label.color).toBe('#fff');
    expect((opt.tooltip as { trigger: string }).trigger).toBe('item');
    expect(opt.xAxis).toBeUndefined();
    expect(opt.yAxis).toBeUndefined();
    expect(opt.grid).toBeUndefined();
  });

  it('coerces non-finite values to 0 and stringifies non-string ids', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { id: [1, 2], parent: [null, 1], value: [Number.NaN, 7] },
      columns: [
        { name: 'id', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'parent', type: 'integer', nullable: true, uniqueCount: 1, nullCount: 1 },
        { name: 'value', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: TreeNode[] }>;
    expect(series[0].data).toEqual([
      { name: '1', value: 0, children: [{ name: '2', value: 7 }] },
    ]);
  });
});

describe('treemap empty guard', () => {
  const def = () => chartRegistry.get('treemap')!;

  it('renders the empty state when no rows produce a tree', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'treemap', columns: { id: 'id', parent: 'parent', value: 'value' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect(el.props).toHaveProperty('message');
  });
});
