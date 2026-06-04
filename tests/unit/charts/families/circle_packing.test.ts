import { describe, expect, it } from 'vitest';
import '@/charts/families/hierarchical/circle_packing';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

const theme = (): ThemeTokens => ({
  mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
  colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
  fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
});

const cfg: ChartConfig = { chartType: 'circle_packing', columns: { id: 'id', parent: 'parent', value: 'value' }, options: {} };
const view: DataView = {
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { id: ['root', 'a', 'b'], parent: ['', 'root', 'root'], value: [30, 10, 20] },
  columns: [], rowCount: 3,
};
const renderer = () => chartRegistry.get('circle_packing')!.createRenderer() as EChartsBaseRenderer;

describe('circle_packing', () => {
  it('registers as an ECharts hierarchical chart', () => {
    const def = chartRegistry.get('circle_packing')!;
    expect(def.family).toBe('hierarchical');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['id', 'parent', 'value']);
  });

  it('builds a circular graph from root and child nodes', () => {
    const opt = renderer().buildOption(view, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; layout: string; data: Array<{ name: string; symbolSize: number }>; links: unknown[] }>;
    expect(series[0].type).toBe('graph');
    expect(series[0].layout).toBe('circular');
    expect(series[0].data.map((node) => node.name)).toEqual(['root', 'a', 'b']);
    expect(series[0].data[0].symbolSize).toBeCloseTo(Math.sqrt(30) * 4);
    expect(series[0].links).toEqual([{ source: 'root', target: 'a' }, { source: 'root', target: 'b' }]);
  });

  it('renders an empty state when no hierarchy rows exist', () => {
    const el = renderer().render({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No hierarchy to chart');
  });

  it('uses a minimum graph node size for tiny values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { id: ['root'], parent: [''], value: [0.1] },
      columns: [], rowCount: 1,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<{ symbolSize: number }> }>;
    expect(series[0].data[0].symbolSize).toBe(8);
  });
});
