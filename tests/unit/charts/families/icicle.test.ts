import { describe, expect, it } from 'vitest';
import '@/charts/families/hierarchical/icicle';
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

const view = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { id: ['root', 'a', 'b'], parent: ['', 'root', 'root'], value: [30, 10, 20] },
  columns: [], rowCount: 3,
});

const cfg: ChartConfig = { chartType: 'icicle', columns: { id: 'id', parent: 'parent', value: 'value' }, options: {} };
const renderer = () => chartRegistry.get('icicle')!.createRenderer() as EChartsBaseRenderer;

describe('icicle', () => {
  it('registers as an ECharts hierarchical chart', () => {
    const def = chartRegistry.get('icicle')!;
    expect(def.family).toBe('hierarchical');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['id', 'parent', 'value']);
  });

  it('builds a treemap-style icicle hierarchy from id/parent/value rows', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; leafDepth: number; breadcrumb: { show: boolean }; data: unknown[] }>;
    expect(series[0].type).toBe('treemap');
    expect(series[0].leafDepth).toBe(2);
    expect(series[0].breadcrumb.show).toBe(false);
    expect(series[0].data).toEqual([{ name: 'root', value: 30, children: [{ name: 'a', value: 10 }, { name: 'b', value: 20 }] }]);
    expect((opt.tooltip as { trigger: string }).trigger).toBe('item');
  });

  it('renders an empty state when no hierarchy rows exist', () => {
    const el = renderer().render({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No hierarchy to chart');
  });
});
