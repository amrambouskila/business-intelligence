import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/grouped_bar';
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

describe('grouped_bar registration', () => {
  it('registers under type "grouped_bar" with the categorical family', () => {
    const def = chartRegistry.get('grouped_bar');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('grouped_bar buildOption', () => {
  const def = () => chartRegistry.get('grouped_bar')!;

  it('pivots long-form rows into one bar series per subgroup, aligned to category order', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        region: ['East', 'East', 'West', 'West'],
        quarter: ['Q1', 'Q2', 'Q1', 'Q2'],
        sales: [10, 20, 30, 40],
      },
      columns: [
        { name: 'region', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'quarter', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'sales', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const cfg: ChartConfig = {
      chartType: 'grouped_bar',
      columns: { category: 'region', subgroup: 'quarter', value: 'sales' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['East', 'West']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    type BarSeries = { type: string; name: string; data: number[]; itemStyle: { color: string } };
    const series = opt.series as BarSeries[];
    expect(series).toHaveLength(2);
    expect(series.every((s) => s.type === 'bar')).toBe(true);
    expect(series[0].name).toBe('Q1');
    expect(series[0].data).toEqual([10, 30]);
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[1].name).toBe('Q2');
    expect(series[1].data).toEqual([20, 40]);
    expect(series[1].itemStyle.color).toBe('#0f0');
    expect((opt.legend as { data: string[]; bottom: number }).data).toEqual(['Q1', 'Q2']);
    expect((opt.legend as { bottom: number }).bottom).toBe(8);
    expect((opt.grid as { bottom: number }).bottom).toBe(72);
  });

  it('fills missing category/subgroup combinations with 0', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        region: ['East', 'West', 'West'],
        quarter: ['Q1', 'Q1', 'Q2'],
        sales: [10, 30, 40],
      },
      columns: [
        { name: 'region', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'quarter', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'sales', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = {
      chartType: 'grouped_bar',
      columns: { category: 'region', subgroup: 'quarter', value: 'sales' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[] }>;
    expect(series[0].name).toBe('Q1');
    expect(series[0].data).toEqual([10, 30]);
    // Q2 has no East row, so the East slot fills with 0.
    expect(series[1].name).toBe('Q2');
    expect(series[1].data).toEqual([0, 40]);
  });

  it('sums duplicate (category, subgroup) rows instead of overwriting', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { region: ['East', 'East'], quarter: ['Q1', 'Q1'], sales: [10, 3] },
      columns: [
        { name: 'region', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'quarter', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'sales', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'grouped_bar', columns: { category: 'region', subgroup: 'quarter', value: 'sales' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([13]);
  });

  it('does not collide when category/subgroup labels contain spaces', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { region: ['West Region', 'Region'], team: ['North', 'North West'], sales: [1, 2] },
      columns: [
        { name: 'region', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'team', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'sales', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'grouped_bar', columns: { category: 'region', subgroup: 'team', value: 'sales' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[] }>;
    // 'North' has 'West Region'=1; 'North West' has 'Region'=2 — no key collision.
    expect(series[0].name).toBe('North');
    expect(series[0].data).toEqual([1, 0]);
    expect(series[1].name).toBe('North West');
    expect(series[1].data).toEqual([0, 2]);
  });

  it('falls back to empty arrays and produces no series when columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = {
      chartType: 'grouped_bar',
      columns: { category: 'missing_c', subgroup: 'missing_s', value: 'missing_v' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect(opt.series as unknown[]).toEqual([]);
    expect((opt.legend as { data: string[] }).data).toEqual([]);
  });
});
