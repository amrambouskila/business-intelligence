import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/chord_diagram';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function dataView(columnArrays: Record<string, unknown[]>, rowCount: number): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount };
}

const cfg: ChartConfig = { chartType: 'chord_diagram', columns: { source: 'src', target: 'tgt', value: 'val' }, options: {} };
const renderer = () => chartRegistry.get('chord_diagram')!.createRenderer() as EChartsBaseRenderer;

type ChordSeries = {
  type: string;
  layout: string;
  circular: { rotateLabel: boolean };
  roam: boolean;
  data: Array<{ name: string; symbolSize: number; itemStyle: { color: string }; label: { show: boolean; color: string } }>;
  links: Array<{ source: string; target: string; value: number; lineStyle: { width: number; opacity: number; curveness: number } }>;
  lineStyle: { color: string; opacity: number };
};

describe('chord_diagram registration', () => {
  it('registers weighted source-target-value roles', () => {
    const def = chartRegistry.get('chord_diagram');
    expect(def).toBeDefined();
    expect(def!.family).toBe('network-flow');
    expect(def!.compatibleShapes).toEqual(['source_target_value', 'generic']);
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['source', 'target', 'value']);
  });
});

describe('chord_diagram buildOption', () => {
  it('builds a circular graph with weighted curved links', () => {
    const opt = renderer().buildOption(dataView({ src: ['a', 'b'], tgt: ['b', 'c'], val: [4, 16] }, 2), cfg, theme()) as EChartsOption;
    const series = (opt.series as ChordSeries[])[0];
    expect(series.type).toBe('graph');
    expect(series.layout).toBe('circular');
    expect(series.circular.rotateLabel).toBe(true);
    expect(series.roam).toBe(true);
    expect(series.data.map((n) => n.name)).toEqual(['a', 'b', 'c']);
    expect(series.data.map((n) => n.itemStyle.color)).toEqual(['#f00', '#0f0', '#f00']);
    expect(series.links.map((l) => l.lineStyle.width)).toEqual([2, 4]);
    expect(series.links[0].lineStyle).toEqual({ width: 2, opacity: 0.55, curveness: 0.25 });
    expect(series.lineStyle).toEqual({ color: 'source', opacity: 0.55 });
  });

  it('coerces non-finite values to 1', () => {
    const opt = renderer().buildOption(dataView({ src: ['a'], tgt: ['b'], val: [Number.NaN] }, 1), cfg, theme()) as EChartsOption;
    const series = (opt.series as ChordSeries[])[0];
    expect(series.links[0].value).toBe(1);
  });

  it('renders empty state when no flows exist', () => {
    const el = renderer().render(dataView({}, 0), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No flows to chart');
  });
});
