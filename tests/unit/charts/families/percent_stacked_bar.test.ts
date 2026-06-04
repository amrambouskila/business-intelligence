import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/percent_stacked_bar';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { EmptyChartState } from '@/charts/renderers/EmptyChartState';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = {
  chartType: 'percent_stacked_bar',
  columns: { category: 'cat', subgroup: 'sub', value: 'val' },
  options: {},
};

describe('percent_stacked_bar registration', () => {
  it('registers under type "percent_stacked_bar" in the categorical family', () => {
    const def = chartRegistry.get('percent_stacked_bar');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['category', 'subgroup', 'value']);
  });
});

describe('percent_stacked_bar buildOption', () => {
  const renderer = () => chartRegistry.get('percent_stacked_bar')!.createRenderer() as EChartsBaseRenderer;

  it('normalizes each category column to 100% across subgroups', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        cat: ['Q1', 'Q1', 'Q2', 'Q2'],
        sub: ['A', 'B', 'A', 'B'],
        val: [30, 10, 20, 20],
      },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'sub', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['Q1', 'Q2']);
    expect((opt.yAxis as { min: number; max: number; name: string }).min).toBe(0);
    expect((opt.yAxis as { max: number }).max).toBe(100);
    expect((opt.yAxis as { name: string }).name).toBe('%');
    expect((opt.legend as { data: string[]; bottom: number }).data).toEqual(['A', 'B']);
    expect((opt.legend as { bottom: number }).bottom).toBe(8);
    expect((opt.grid as { bottom: number }).bottom).toBe(72);

    const series = opt.series as Array<{ type: string; name: string; stack: string; data: number[]; itemStyle: { color: string } }>;
    expect(series).toHaveLength(2);
    expect(series.every((s) => s.type === 'bar')).toBe(true);
    expect(series.every((s) => s.stack === 'total')).toBe(true);

    // Q1: A=30/40=75%, B=10/40=25%. Q2: A=20/40=50%, B=20/40=50%.
    expect(series[0].name).toBe('A');
    expect(series[0].data[0]).toBeCloseTo(75);
    expect(series[0].data[1]).toBeCloseTo(50);
    expect(series[1].name).toBe('B');
    expect(series[1].data[0]).toBeCloseTo(25);
    expect(series[1].data[1]).toBeCloseTo(50);

    // Each category column sums to 100.
    expect(series[0].data[0] + series[1].data[0]).toBeCloseTo(100);
    expect(series[0].data[1] + series[1].data[1]).toBeCloseTo(100);

    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[1].itemStyle.color).toBe('#0f0');
  });

  it('emits 0 for every subgroup when a category column total is 0', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        cat: ['Z', 'Z'],
        sub: ['A', 'B'],
        val: [0, 0],
      },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'sub', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([0]);
    expect(series[1].data).toEqual([0]);
  });

  it('drops non-finite values before normalizing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        cat: ['Q1', 'Q1', 'Q1'],
        sub: ['A', 'B', 'A'],
        val: [Number.NaN, 25, 75],
      },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'sub', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: true, uniqueCount: 2, nullCount: 1 },
      ],
      rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[] }>;
    // A total = 0 + 75 = 75, B total = 25, column total = 100.
    expect(series[0].name).toBe('A');
    expect(series[0].data[0]).toBeCloseTo(75);
    expect(series[1].name).toBe('B');
    expect(series[1].data[0]).toBeCloseTo(25);
  });

  it('shows the empty state when the required role yields no groups or keys', () => {
    const emptyDv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const el = chartRegistry.get('percent_stacked_bar')!.createRenderer().render(emptyDv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No values to chart');
  });

  it('falls back to empty arrays when the referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const missing: ChartConfig = {
      chartType: 'percent_stacked_bar',
      columns: { category: 'nc', subgroup: 'ns', value: 'nv' },
      options: {},
    };
    const opt = renderer().buildOption(dv, missing, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect(opt.series as unknown[]).toEqual([]);
  });

  it('renders the chart (not the empty state) when both groups and keys are present', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['Q1'], sub: ['A'], val: [10] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'sub', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const el = chartRegistry.get('percent_stacked_bar')!.createRenderer().render(dv, cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });
});
