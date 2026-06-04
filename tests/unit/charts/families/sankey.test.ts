import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/sankey';
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

function dataView(columnArrays: Record<string, unknown[]>, rowCount: number): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount };
}

const cfg: ChartConfig = {
  chartType: 'sankey',
  columns: { source: 'src', target: 'tgt', value: 'val' },
  options: {},
};

const renderer = () => chartRegistry.get('sankey')!.createRenderer() as EChartsBaseRenderer;

type SankeySeries = {
  type: string;
  data: Array<{ name: string }>;
  links: Array<{ source: string; target: string; value: number }>;
  label: { color: string };
  lineStyle: { color: string; opacity: number };
};

describe('sankey registration', () => {
  it('registers under type "sankey" with the network-flow family', () => {
    const def = chartRegistry.get('sankey');
    expect(def).toBeDefined();
    expect(def!.family).toBe('network-flow');
    expect(def!.renderer).toBe('echarts');
    expect(def!.compatibleShapes).toEqual(['source_target_value', 'generic']);
  });

  it('declares source, target, and value as required columns', () => {
    const roles = chartRegistry.get('sankey')!.requiredColumns.map((c) => c.role);
    expect(roles).toEqual(['source', 'target', 'value']);
  });
});

describe('sankey buildOption', () => {
  it('builds unique first-seen nodes and one link per row', () => {
    const dv = dataView(
      { src: ['a', 'a', 'b'], tgt: ['b', 'c', 'c'], val: [5, 3, 2] },
      3,
    );
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as SankeySeries[])[0];

    expect(series.type).toBe('sankey');
    // union of source+target in first-seen order: a, b, c
    expect(series.data).toEqual([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    expect(series.links).toEqual([
      { source: 'a', target: 'b', value: 5 },
      { source: 'a', target: 'c', value: 3 },
      { source: 'b', target: 'c', value: 2 },
    ]);
    expect(series.label.color).toBe('#fff');
    expect(series.lineStyle).toEqual({ color: 'gradient', opacity: 0.5 });
    expect(opt.xAxis).toBeUndefined();
    expect(opt.yAxis).toBeUndefined();
    expect(opt.grid).toBeUndefined();
  });

  it('stringifies non-string node values', () => {
    const dv = dataView({ src: [1, 2], tgt: [2, 3], val: [10, 20] }, 2);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as SankeySeries[])[0];
    expect(series.data).toEqual([{ name: '1' }, { name: '2' }, { name: '3' }]);
    expect(series.links).toEqual([
      { source: '1', target: '2', value: 10 },
      { source: '2', target: '3', value: 20 },
    ]);
  });

  it('coerces non-finite values to 0', () => {
    const dv = dataView({ src: ['a', 'b'], tgt: ['b', 'c'], val: [Number.NaN, 'x'] }, 2);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as SankeySeries[])[0];
    expect(series.links.map((l) => l.value)).toEqual([0, 0]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const missingCfg: ChartConfig = {
      chartType: 'sankey',
      columns: { source: 'missing', target: 'also_missing', value: 'gone' },
      options: {},
    };
    const opt = renderer().buildOption(dataView({}, 0), missingCfg, theme()) as EChartsOption;
    const series = (opt.series as SankeySeries[])[0];
    expect(series.data).toEqual([]);
    expect(series.links).toEqual([]);
  });
});

describe('sankey empty guard', () => {
  it('renders the empty state when there are no links', () => {
    const el = renderer().render(dataView({ src: [], tgt: [], val: [] }, 0), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No flows to chart');
  });

  it('renders a chart when at least one link exists', () => {
    const dv = dataView({ src: ['a'], tgt: ['b'], val: [1] }, 1);
    const el = renderer().render(dv, cfg, theme());
    expect((el.props as { option: { series: Array<{ type: string }> } }).option.series[0].type).toBe('sankey');
  });
});
