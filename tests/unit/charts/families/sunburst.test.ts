import { describe, it, expect } from 'vitest';
import '@/charts/families/hierarchical/sunburst';
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

const cfg = (): ChartConfig => ({
  chartType: 'sunburst', columns: { id: 'id', parent: 'parent', value: 'value' }, options: {},
});

const treeView = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: {
    id: ['a', 'b', 'c', 'd'],
    parent: [null, 'a', 'a', 'b'],
    value: [0, 10, 20, 5],
  },
  columns: [
    { name: 'id', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
    { name: 'parent', type: 'category', nullable: true, uniqueCount: 3, nullCount: 1 },
    { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
  ],
  rowCount: 4,
});

describe('sunburst registration', () => {
  it('registers under type "sunburst" with the hierarchical family', () => {
    const def = chartRegistry.get('sunburst');
    expect(def).toBeDefined();
    expect(def!.family).toBe('hierarchical');
    expect(def!.renderer).toBe('echarts');
  });

  it('declares id/parent/value as required columns and hierarchy/generic shapes', () => {
    const def = chartRegistry.get('sunburst')!;
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['id', 'parent', 'value']);
    expect(def.compatibleShapes).toEqual(['hierarchy', 'generic']);
  });
});

describe('sunburst buildOption', () => {
  const def = () => chartRegistry.get('sunburst')!;

  it('builds a sunburst series from the nested tree with foreground label color', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(treeView(), cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: unknown; label: { color: string } }>;
    expect(series).toHaveLength(1);
    expect(series[0].type).toBe('sunburst');
    expect(series[0].label.color).toBe('#fff');
    expect(series[0].data).toEqual([
      {
        name: 'a',
        value: 0,
        children: [
          { name: 'b', value: 10, children: [{ name: 'd', value: 5 }] },
          { name: 'c', value: 20 },
        ],
      },
    ]);
  });

  it('uses an item tooltip and emits no axes or grid', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(treeView(), cfg(), theme()) as EChartsOption;
    expect((opt.tooltip as { trigger: string }).trigger).toBe('item');
    expect(opt.xAxis).toBeUndefined();
    expect(opt.yAxis).toBeUndefined();
    expect(opt.grid).toBeUndefined();
  });
});

describe('sunburst empty guard', () => {
  const def = () => chartRegistry.get('sunburst')!;

  it('renders the empty state when the resolved tree has no roots', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = def().createRenderer().render(dv, cfg(), theme());
    expect(el.props).toHaveProperty('message');
  });

  it('renders a chart when the tree has at least one node', () => {
    const el = def().createRenderer().render(treeView(), cfg(), theme());
    expect(el.props).toHaveProperty('option');
  });
});
