import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/stacked_bar';
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

describe('stacked_bar registration', () => {
  it('registers under type "stacked_bar" with the categorical family', () => {
    const def = chartRegistry.get('stacked_bar');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('stacked_bar buildOption', () => {
  const def = () => chartRegistry.get('stacked_bar')!;

  it('pivots (category, subgroup, value) into one stacked series per subgroup', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        cat: ['Q1', 'Q1', 'Q2', 'Q2', 'Q1'],
        sub: ['A', 'B', 'A', 'B', 'A'],
        val: [10, 5, 20, 7, 3],
      },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'sub', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 5, nullCount: 0 },
      ],
      rowCount: 5,
    };
    const cfg: ChartConfig = {
      chartType: 'stacked_bar',
      columns: { category: 'cat', subgroup: 'sub', value: 'val' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['Q1', 'Q2']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
    expect((opt.legend as { data: string[]; bottom: number }).data).toEqual(['A', 'B']);
    expect((opt.legend as { bottom: number }).bottom).toBe(8);
    expect((opt.grid as { bottom: number }).bottom).toBe(72);

    const series = opt.series as Array<{ type: string; name: string; stack: string; data: number[]; itemStyle: { color: string } }>;
    expect(series).toHaveLength(2);
    expect(series.every((s) => s.type === 'bar')).toBe(true);
    expect(series.every((s) => s.stack === 'total')).toBe(true);
    expect(series[0].name).toBe('A');
    // A: Q1 = 10 + 3 = 13, Q2 = 20
    expect(series[0].data).toEqual([13, 20]);
    // B appears only after Q1 was seen, so its Q1 slot is 0-backfilled, Q2 = 7
    expect(series[1].name).toBe('B');
    expect(series[1].data).toEqual([5, 7]);
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[1].itemStyle.color).toBe('#0f0');
  });

  it('treats non-finite values as zero', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        cat: ['Q1', 'Q1'],
        sub: ['A', 'A'],
        val: [Number.NaN, 4],
      },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'sub', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: true, uniqueCount: 1, nullCount: 1 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = {
      chartType: 'stacked_bar',
      columns: { category: 'cat', subgroup: 'sub', value: 'val' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([4]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = {
      chartType: 'stacked_bar',
      columns: { category: 'nope_c', subgroup: 'nope_s', value: 'nope_v' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect(opt.series as unknown[]).toEqual([]);
  });
});
