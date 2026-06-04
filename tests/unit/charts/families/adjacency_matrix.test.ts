import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/adjacency_matrix';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#999'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(columnArrays: Record<string, unknown[]> = { src: ['a', 'a', 'a'], tgt: ['b', 'b', 'c'], val: [4, 6, 9] }): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: Object.values(columnArrays)[0]?.length ?? 0 };
}

const cfg: ChartConfig = { chartType: 'adjacency_matrix', columns: { source: 'src', target: 'tgt', value: 'val' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('adjacency_matrix')!.createRenderer() as EChartsBaseRenderer;
}

describe('adjacency_matrix', () => {
  it('registers source and target roles with optional value', () => {
    const def = chartRegistry.get('adjacency_matrix')!;
    expect(def.family).toBe('network-flow');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['source', 'target']);
    expect(def.optionalColumns!.map((c) => c.role)).toEqual(['value']);
  });

  it('aggregates directed edge weights into heatmap cells', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['a', 'b', 'c']);
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'b', 'c']);
    expect(opt.visualMap).toMatchObject({ min: 0, max: 10, inRange: { color: ['#000', '#999'] } });
    const series = (opt.series as Array<{ type: string; data: unknown[]; label: { show: boolean } }>)[0];
    expect(series.type).toBe('heatmap');
    expect(series.data).toEqual([[1, 0, 10, 'a', 'b'], [2, 0, 9, 'a', 'c']]);
    expect(series.label.show).toBe(true);
  });

  it('rotates dense node labels and hides cell labels', () => {
    const names = Array.from({ length: 9 }, (_, i) => `n${i}`);
    const opt = renderer().buildOption(view({ src: names, tgt: [...names].reverse(), val: names.map(() => 1) }), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { axisLabel: { rotate?: number } }).axisLabel.rotate).toBe(35);
    const series = (opt.series as Array<{ label: { show: boolean } }>)[0];
    expect(series.label.show).toBe(false);
  });

  it('drops null endpoints and defaults invalid values to one', () => {
    const opt = renderer().buildOption(view({ src: ['a', null, 'b'], tgt: ['b', 'c', null], val: [NaN, 2, 'bad'] }), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ data: unknown[] }>)[0];
    expect(series.data).toEqual([[1, 0, 1, 'a', 'b']]);
  });

  it('formats tooltips and handles empty params', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const formatter = (opt.tooltip as { formatter: (p: unknown) => string }).formatter;
    expect(formatter({ data: [1, 0, 10, 'a', 'b'] })).toBe('a -> b: 10');
    expect(formatter({})).toBe('');
  });

  it('shows an empty state when no adjacency edges exist', () => {
    const el = renderer().render(view({}), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No adjacency edges to chart');
  });
});
