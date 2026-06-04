import { describe, expect, it } from 'vitest';
import '@/charts/families/hierarchical/dendrogram';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

const theme = (): ThemeTokens => ({
  mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
  colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
  fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
});

const cfg: ChartConfig = { chartType: 'dendrogram', columns: { id: 'id', parent: 'parent', value: 'value' }, options: {} };
const view: DataView = {
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { id: ['root', 'a'], parent: ['', 'root'], value: [9, 4] },
  columns: [], rowCount: 2,
};
const renderer = () => chartRegistry.get('dendrogram')!.createRenderer() as EChartsBaseRenderer;

describe('dendrogram', () => {
  it('registers as a node-link hierarchical chart', () => {
    const def = chartRegistry.get('dendrogram')!;
    expect(def.family).toBe('hierarchical');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['id', 'parent']);
    expect(def.optionalColumns!.map((c) => c.role)).toEqual(['value']);
  });

  it('builds a left-to-right orthogonal tree with leaf labels', () => {
    const opt = renderer().buildOption(view, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; layout: string; orient: string; expandAndCollapse: boolean; leaves: unknown }>;
    expect(series[0].type).toBe('tree');
    expect(series[0].layout).toBe('orthogonal');
    expect(series[0].orient).toBe('LR');
    expect(series[0].expandAndCollapse).toBe(false);
    expect(series[0].leaves).toBeDefined();
  });

  it('defaults values when the optional value column is unassigned', () => {
    const opt = renderer().buildOption(view, { chartType: 'dendrogram', columns: { id: 'id', parent: 'parent' }, options: {} }, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<{ value: number }> }>;
    expect(series[0].data[0].value).toBe(1);
  });

  it('renders an empty state when no hierarchy rows exist', () => {
    const el = renderer().render({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No hierarchy to chart');
  });

  it('falls back to an empty value array when an assigned value column is absent', () => {
    const opt = renderer().buildOption(view, { chartType: 'dendrogram', columns: { id: 'id', parent: 'parent', value: 'missing' }, options: {} }, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });
});
