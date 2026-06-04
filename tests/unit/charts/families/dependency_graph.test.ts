import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/dependency_graph';
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

function view(columnArrays: Record<string, unknown[]> = { src: ['root', 'root', 'api'], tgt: ['api', 'ui', 'db'], val: [4, 1, 9] }): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: Object.values(columnArrays)[0]?.length ?? 0 };
}

const cfg: ChartConfig = { chartType: 'dependency_graph', columns: { source: 'src', target: 'tgt', value: 'val' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('dependency_graph')!.createRenderer() as EChartsBaseRenderer;
}

describe('dependency_graph', () => {
  it('registers source and target roles with optional value', () => {
    const def = chartRegistry.get('dependency_graph')!;
    expect(def.family).toBe('network-flow');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['source', 'target']);
    expect(def.optionalColumns!.map((c) => c.role)).toEqual(['value']);
  });

  it('builds fixed-position dependency nodes by inferred depth', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{
      type: string; layout: string; edgeSymbol: string[]; lineStyle: { color: string };
      data: Array<{ name: string; x: number; y: number; itemStyle: { color: string } }>;
      links: Array<{ source: string; target: string; value: number; lineStyle: { width: number; curveness: number } }>;
    }>)[0];
    expect(series.type).toBe('graph');
    expect(series.layout).toBe('none');
    expect(series.edgeSymbol).toEqual(['none', 'arrow']);
    expect(series.lineStyle.color).toBe('#333');
    expect(series.data.map((node) => [node.name, node.x, node.y])).toEqual([
      ['root', 0, 50],
      ['api', 50, 18],
      ['ui', 50, 82],
      ['db', 100, 50],
    ]);
    expect(series.data[0].itemStyle.color).toBe('#f00');
    expect(series.links[2]).toMatchObject({ source: 'api', target: 'db', value: 9, lineStyle: { width: 3, curveness: 0.12 } });
  });

  it('keeps single-node depth groups vertically centered', () => {
    const opt = renderer().buildOption(view({ src: ['a'], tgt: ['b'], val: [1] }), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ data: Array<{ y: number }> }>)[0];
    expect(series.data.map((node) => node.y)).toEqual([50, 50]);
  });

  it('drops null endpoints and defaults invalid values to one', () => {
    const opt = renderer().buildOption(view({ src: ['a', null, 'b'], tgt: ['b', 'c', null], val: [NaN, 2, 'bad'] }), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ data: Array<{ name: string }>; links: Array<{ value: number }> }>)[0];
    expect(series.data.map((node) => node.name)).toEqual(['a', 'b']);
    expect(series.links.map((link) => link.value)).toEqual([1]);
  });

  it('shows an empty state when no dependencies exist', () => {
    const el = renderer().render(view({}), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No dependencies to chart');
  });
});
