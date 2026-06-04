import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/force_directed_graph';
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

function dataView(columnArrays: Record<string, unknown[]>, rowCount: number): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount };
}

const cfg: ChartConfig = {
  chartType: 'force_directed_graph',
  columns: { source: 'src', target: 'tgt', value: 'val' },
  options: {},
};

const renderer = () => chartRegistry.get('force_directed_graph')!.createRenderer() as EChartsBaseRenderer;

type GraphNode = { name: string; itemStyle: { color: string } };
type GraphSeries = {
  type: string;
  layout: string;
  roam: boolean;
  force: { repulsion: number; edgeLength: number };
  data: GraphNode[];
  links: Array<{ source: string; target: string; value: number }>;
  label: { show: boolean; color: string };
  lineStyle: { color: string; opacity: number };
};

describe('force_directed_graph registration', () => {
  it('registers under type "force_directed_graph" with the network-flow family', () => {
    const def = chartRegistry.get('force_directed_graph');
    expect(def).toBeDefined();
    expect(def!.family).toBe('network-flow');
    expect(def!.renderer).toBe('echarts');
    expect(def!.compatibleShapes).toEqual(['source_target_value', 'nodes_edges', 'generic']);
  });

  it('declares source and target as required columns and value as optional', () => {
    const def = chartRegistry.get('force_directed_graph')!;
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['source', 'target']);
    expect(def.optionalColumns!.map((c) => c.role)).toEqual(['value']);
  });
});

describe('force_directed_graph buildOption', () => {
  it('builds first-seen nodes, one link per row, and force layout', () => {
    const dv = dataView({ src: ['a', 'a'], tgt: ['b', 'c'], val: [5, 3] }, 2);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as GraphSeries[])[0];

    expect(series.type).toBe('graph');
    expect(series.layout).toBe('force');
    expect(series.roam).toBe(true);
    expect(series.force).toEqual({ repulsion: 120, edgeLength: 80 });
    // union of source+target in first-seen order: a, b, c (3 nodes)
    expect(series.data.map((n) => n.name)).toEqual(['a', 'b', 'c']);
    expect(series.links).toEqual([
      { source: 'a', target: 'b', value: 5 },
      { source: 'a', target: 'c', value: 3 },
    ]);
    expect(series.label).toEqual({ show: true, color: '#fff' });
    expect(series.lineStyle).toEqual({ color: '#333', opacity: 0.6 });
  });

  it('colors nodes by cycling the categorical palette', () => {
    const dv = dataView({ src: ['a', 'c'], tgt: ['b', 'd'] }, 2);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as GraphSeries[])[0];
    // 4 nodes a,b,c,d across a 3-color palette cycle to the first color again
    expect(series.data.map((n) => n.itemStyle.color)).toEqual(['#f00', '#0f0', '#00f', '#f00']);
  });

  it('defaults edge value to 1 when no value column is assigned', () => {
    const noValueCfg: ChartConfig = {
      chartType: 'force_directed_graph',
      columns: { source: 'src', target: 'tgt' },
      options: {},
    };
    const dv = dataView({ src: ['a'], tgt: ['b'] }, 1);
    const opt = renderer().buildOption(dv, noValueCfg, theme()) as EChartsOption;
    const series = (opt.series as GraphSeries[])[0];
    expect(series.links).toEqual([{ source: 'a', target: 'b', value: 1 }]);
  });

  it('defaults non-finite values to 1', () => {
    const dv = dataView({ src: ['a', 'b'], tgt: ['b', 'c'], val: [Number.NaN, 'x'] }, 2);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as GraphSeries[])[0];
    expect(series.links.map((l) => l.value)).toEqual([1, 1]);
  });

  it('stringifies non-string node values', () => {
    const dv = dataView({ src: [1, 2], tgt: [2, 3], val: [10, 20] }, 2);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as GraphSeries[])[0];
    expect(series.data.map((n) => n.name)).toEqual(['1', '2', '3']);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const missingCfg: ChartConfig = {
      chartType: 'force_directed_graph',
      columns: { source: 'missing', target: 'also_missing', value: 'gone' },
      options: {},
    };
    const opt = renderer().buildOption(dataView({}, 0), missingCfg, theme()) as EChartsOption;
    const series = (opt.series as GraphSeries[])[0];
    expect(series.data).toEqual([]);
    expect(series.links).toEqual([]);
  });
});

describe('force_directed_graph empty guard', () => {
  it('renders the empty state when there are no edges', () => {
    const el = renderer().render(dataView({ src: [], tgt: [], val: [] }, 0), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No edges to chart');
  });

  it('renders a chart when at least one edge exists', () => {
    const dv = dataView({ src: ['a'], tgt: ['b'], val: [1] }, 1);
    const el = renderer().render(dv, cfg, theme());
    expect((el.props as { option: { series: Array<{ type: string }> } }).option.series[0].type).toBe('graph');
  });
});
