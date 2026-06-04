import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/network_graph';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(columnArrays: Record<string, unknown[]> = { src: ['a', 'a'], tgt: ['b', 'c'], val: [4, 9] }): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: Object.values(columnArrays)[0]?.length ?? 0 };
}

const cfg: ChartConfig = { chartType: 'network_graph', columns: { source: 'src', target: 'tgt', value: 'val' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('network_graph')!.createRenderer() as EChartsBaseRenderer;
}

describe('network_graph', () => {
  it('registers source and target roles with optional value', () => {
    const def = chartRegistry.get('network_graph')!;
    expect(def.family).toBe('network-flow');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['source', 'target']);
    expect(def.optionalColumns!.map((c) => c.role)).toEqual(['value']);
  });

  it('builds a circular directed graph with weighted edges', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{
      type: string; layout: string; edgeSymbol: string[]; data: Array<{ name: string; symbolSize: number; itemStyle: { color: string } }>;
      links: Array<{ source: string; target: string; value: number; lineStyle: { width: number; opacity: number } }>;
    }>)[0];
    expect(series.type).toBe('graph');
    expect(series.layout).toBe('circular');
    expect(series.edgeSymbol).toEqual(['none', 'arrow']);
    expect(series.data.map((node) => node.name)).toEqual(['a', 'b', 'c']);
    expect(series.data[0].symbolSize).toBe(36);
    expect(series.data.map((node) => node.itemStyle.color)).toEqual(['#f00', '#0f0', '#00f']);
    expect(series.links[1]).toMatchObject({ source: 'a', target: 'c', value: 9, lineStyle: { width: 3, opacity: 0.55 } });
  });

  it('drops null endpoints and defaults missing values to one', () => {
    const noValueCfg: ChartConfig = { chartType: 'network_graph', columns: { source: 'src', target: 'tgt' }, options: {} };
    const opt = renderer().buildOption(view({ src: ['a', null, 'b'], tgt: ['b', 'c', null] }), noValueCfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ data: Array<{ name: string }>; links: Array<{ value: number }> }>)[0];
    expect(series.data.map((node) => node.name)).toEqual(['a', 'b']);
    expect(series.links.map((link) => link.value)).toEqual([1]);
  });

  it('defaults non-finite values to one', () => {
    const opt = renderer().buildOption(view({ src: ['a', 'b'], tgt: ['b', 'c'], val: [NaN, 'bad'] }), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ links: Array<{ value: number }> }>)[0];
    expect(series.links.map((link) => link.value)).toEqual([1, 1]);
  });

  it('shows an empty state when no edges exist', () => {
    const el = renderer().render(view({}), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No network edges to chart');
  });
});
