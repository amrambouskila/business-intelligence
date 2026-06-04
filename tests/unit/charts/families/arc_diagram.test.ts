import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/arc_diagram';
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
  chartType: 'arc_diagram',
  columns: { source: 'src', target: 'tgt', value: 'val' },
  options: {},
};

const renderer = () => chartRegistry.get('arc_diagram')!.createRenderer() as EChartsBaseRenderer;

type ArcSeries = {
  type: string;
  layout: string;
  data: Array<{ name: string; x: number; y: number; symbolSize: number; itemStyle: { color: string }; label: { show: boolean; color: string } }>;
  links: Array<{ source: string; target: string; value: number; lineStyle: { width: number; curveness: number; opacity: number } }>;
  edgeSymbol: [string, string];
  lineStyle: { color: string };
};

describe('arc_diagram registration', () => {
  it('registers under network-flow with source and target required', () => {
    const def = chartRegistry.get('arc_diagram');
    expect(def).toBeDefined();
    expect(def!.family).toBe('network-flow');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['source', 'target']);
    expect(def!.optionalColumns!.map((c) => c.role)).toEqual(['value']);
  });
});

describe('arc_diagram buildOption', () => {
  it('lays first-seen nodes along one axis and connects weighted arcs', () => {
    const dv = dataView({ src: ['a', 'a'], tgt: ['b', 'c'], val: [4, 9] }, 2);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as ArcSeries[])[0];

    expect(series.type).toBe('graph');
    expect(series.layout).toBe('none');
    expect(series.data.map((n) => n.name)).toEqual(['a', 'b', 'c']);
    expect(series.data.map((n) => n.x)).toEqual([0, 50, 100]);
    expect(series.data[0].y).toBe(50);
    expect(series.data.map((n) => n.itemStyle.color)).toEqual(['#f00', '#0f0', '#00f']);
    expect(series.data[0].label).toEqual({ show: true, color: '#fff' });
    expect(series.links).toEqual([
      { source: 'a', target: 'b', value: 4, lineStyle: { width: 2, curveness: 0.35, opacity: 0.65 } },
      { source: 'a', target: 'c', value: 9, lineStyle: { width: 3, curveness: 0.35, opacity: 0.65 } },
    ]);
    expect(series.edgeSymbol).toEqual(['none', 'none']);
    expect(series.lineStyle.color).toBe('#333');
  });

  it('defaults missing or non-finite values to 1 and stringifies nodes', () => {
    const noValueCfg: ChartConfig = { chartType: 'arc_diagram', columns: { source: 'src', target: 'tgt' }, options: {} };
    const opt = renderer().buildOption(dataView({ src: [1], tgt: [2], val: [Number.NaN] }, 1), noValueCfg, theme()) as EChartsOption;
    const series = (opt.series as ArcSeries[])[0];
    expect(series.data.map((n) => n.name)).toEqual(['1', '2']);
    expect(series.links[0].value).toBe(1);
  });

  it('uses the single-node coordinate fallback', () => {
    const opt = renderer().buildOption(dataView({ src: ['a'], tgt: ['a'], val: [2] }, 1), cfg, theme()) as EChartsOption;
    const series = (opt.series as ArcSeries[])[0];
    expect(series.data).toHaveLength(1);
    expect(series.data[0].x).toBe(50);
    expect(series.links[0].lineStyle.curveness).toBe(0.5);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const opt = renderer().buildOption(dataView({}, 0), cfg, theme()) as EChartsOption;
    const series = (opt.series as ArcSeries[])[0];
    expect(series.data).toEqual([]);
    expect(series.links).toEqual([]);
  });
});

describe('arc_diagram empty guard', () => {
  it('renders the empty state when there are no edges', () => {
    const el = renderer().render(dataView({}, 0), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No edges to chart');
  });
});
