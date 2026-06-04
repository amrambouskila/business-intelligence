import { describe, expect, it } from 'vitest';
import '@/charts/families/hierarchical/radial_tree';
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

const cfg = (withValue = false): ChartConfig => ({
  chartType: 'radial_tree',
  columns: withValue ? { id: 'id', parent: 'parent', value: 'value' } : { id: 'id', parent: 'parent' },
  options: {},
});
const view: DataView = {
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { id: ['root', 'a'], parent: ['', 'root'], value: [9, 4] },
  columns: [], rowCount: 2,
};
const renderer = () => chartRegistry.get('radial_tree')!.createRenderer() as EChartsBaseRenderer;

describe('radial_tree', () => {
  it('registers with optional value and hierarchy shapes', () => {
    const def = chartRegistry.get('radial_tree')!;
    expect(def.family).toBe('hierarchical');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['id', 'parent']);
    expect(def.optionalColumns!.map((c) => c.role)).toEqual(['value']);
  });

  it('builds a radial tree series and defaults values when unassigned', () => {
    const opt = renderer().buildOption(view, cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; layout: string; data: Array<{ value: number; children?: unknown[] }> }>;
    expect(series[0].type).toBe('tree');
    expect(series[0].layout).toBe('radial');
    expect(series[0].data[0].value).toBe(1);
  });

  it('uses the assigned value column and renders an empty state for no rows', () => {
    const opt = renderer().buildOption(view, cfg(true), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<{ value: number }> }>;
    expect(series[0].data[0].value).toBe(9);
    const el = renderer().render({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No hierarchy to chart');
  });

  it('falls back to an empty value array when an assigned value column is absent', () => {
    const opt = renderer().buildOption(view, { chartType: 'radial_tree', columns: { id: 'id', parent: 'parent', value: 'missing' }, options: {} }, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<{ value: number }> }>;
    expect(series[0].data).toEqual([]);
  });
});
