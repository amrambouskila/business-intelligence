import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/lollipop';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

interface SeriesEntry {
  type: string;
  data: number[];
  barWidth?: number;
  symbolSize?: number;
  itemStyle: { color: string };
}

describe('lollipop registration', () => {
  it('registers under type "lollipop" with the categorical family', () => {
    const def = chartRegistry.get('lollipop');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('lollipop buildOption', () => {
  const def = () => chartRegistry.get('lollipop')!;

  it('builds a category x-axis plus stem (bar) and head (scatter) series aligned to categories', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [10, 20, 30] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'lollipop', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { type: string }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['a', 'b', 'c']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    const series = opt.series as SeriesEntry[];
    expect(series).toHaveLength(2);

    const stem = series[0];
    expect(stem.type).toBe('bar');
    expect(stem.barWidth).toBe(3);
    expect(stem.data).toEqual([10, 20, 30]);
    expect(stem.itemStyle.color).toBe('#f00');

    const head = series[1];
    expect(head.type).toBe('scatter');
    expect(head.symbolSize).toBe(12);
    expect(head.data).toEqual([10, 20, 30]);
    expect(head.itemStyle.color).toBe('#f00');
  });

  it('drops non-finite values from both series, keeping the two aligned', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c', 'd'], val: [10, NaN, Infinity, 40] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
        { name: 'val', type: 'numeric', nullable: false, uniqueCount: 4, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'lollipop', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['a', 'd']);
    const series = opt.series as SeriesEntry[];
    expect(series[0].data).toEqual([10, 40]);
    expect(series[1].data).toEqual([10, 40]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'lollipop', columns: { category: 'missing', value: 'also_missing' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    const series = opt.series as SeriesEntry[];
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });
});

describe('lollipop empty guard', () => {
  const def = () => chartRegistry.get('lollipop')!;

  it('renders the empty state when no finite values remain', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b'], val: [NaN, Infinity] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'numeric', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'lollipop', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect(el.props).toHaveProperty('message');
    expect((el.props as { message: string }).message).toBe('No finite values to display');
  });

  it('renders a chart when at least one finite value is present', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b'], val: [NaN, 5] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'numeric', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'lollipop', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBeUndefined();
    expect(el.props).toHaveProperty('option');
  });
});
