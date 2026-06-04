import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/topic_term_bubble';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(weights: unknown[] = [0.8, 0.4, 0.6]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { topic: ['A', 'A', 'B'], term: ['one', 'two', 'one'], weight: weights },
    columns: [], rowCount: weights.length,
  };
}

const cfg: ChartConfig = { chartType: 'topic_term_bubble', columns: { topic: 'topic', term: 'term', weight: 'weight' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('topic_term_bubble')!.createRenderer() as EChartsBaseRenderer;
}

describe('topic_term_bubble', () => {
  it('registers topic, term, and weight roles', () => {
    const def = chartRegistry.get('topic_term_bubble')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['topic', 'term', 'weight']);
  });

  it('builds a categorical bubble grid with scaled symbols', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['one', 'two']);
    expect((opt.yAxis as { data: string[] }).data).toEqual(['A', 'B']);
    const series = opt.series as Array<{ type: string; data: unknown[]; symbolSize: (v: [number, number, number]) => number }>;
    expect(series[0].type).toBe('scatter');
    expect(series[0].data[0]).toEqual([0, 0, 0.8, 'one', 'A']);
    expect(series[0].symbolSize([0, 0, 0.8])).toBeGreaterThan(series[0].symbolSize([0, 0, 0.4]));
    const formatter = (opt.tooltip as { formatter: (p: unknown) => string }).formatter;
    expect(formatter({ data: [0, 0, 0.8, 'one', 'A'] })).toBe('A<br/>one: 0.8');
    expect(formatter({})).toBe('');
  });

  it('uses the fallback radius for constant weights and drops invalid rows', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { topic: ['A', null, 'B', 'B'], term: ['one', 'two', null, 'three'], weight: [1, 1, 1, 'x'] },
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[]; symbolSize: (v: [number, number, number]) => number }>;
    expect(series[0].data).toHaveLength(1);
    expect(series[0].symbolSize([0, 0, 1])).toBe(18);
  });

  it('rotates dense term labels', () => {
    const terms = Array.from({ length: 9 }, (_, i) => `term-${i}`);
    const dv: DataView = {
      ...view(),
      columnArrays: { topic: terms.map(() => 'A'), term: terms, weight: terms.map((_, i) => i + 1) },
      rowCount: terms.length,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { axisLabel: { rotate?: number } }).axisLabel.rotate).toBe(35);
  });

  it('shows an empty state when no finite weights exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No topic-term weights to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No topic-term weights to chart');
  });
});
