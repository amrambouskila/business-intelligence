import { describe, expect, it } from 'vitest';
import '@/charts/families/hierarchical/partition_chart';
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

const cfg: ChartConfig = { chartType: 'partition_chart', columns: { id: 'id', parent: 'parent', value: 'value' }, options: {} };
const view: DataView = {
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { id: ['root', 'a', 'b'], parent: ['', 'root', 'root'], value: [30, 10, 20] },
  columns: [], rowCount: 3,
};
const renderer = () => chartRegistry.get('partition_chart')!.createRenderer() as EChartsBaseRenderer;

describe('partition_chart', () => {
  it('registers as an ECharts hierarchical chart', () => {
    const def = chartRegistry.get('partition_chart')!;
    expect(def.family).toBe('hierarchical');
    expect(def.renderer).toBe('echarts');
    expect(def.compatibleShapes).toEqual(['hierarchy', 'generic']);
  });

  it('builds a partition-style sunburst with explicit levels', () => {
    const opt = renderer().buildOption(view, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; radius: string[]; levels: unknown[]; data: unknown[] }>;
    expect(series[0].type).toBe('sunburst');
    expect(series[0].radius).toEqual(['0%', '92%']);
    expect(series[0].levels).toHaveLength(4);
    expect(series[0].data).toEqual([{ name: 'root', value: 30, children: [{ name: 'a', value: 10 }, { name: 'b', value: 20 }] }]);
  });

  it('renders an empty state when no hierarchy rows exist', () => {
    const el = renderer().render({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No hierarchy to chart');
  });
});
