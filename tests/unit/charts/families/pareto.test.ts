import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/pareto';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('pareto registration', () => {
  it('registers under type "pareto" with the categorical family and echarts renderer', () => {
    const def = chartRegistry.get('pareto');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['category', 'value']);
  });
});

describe('pareto buildOption', () => {
  const def = () => chartRegistry.get('pareto')!;

  it('sorts bars descending and the cumulative line ends at 100', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [3, 1, 2] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'pareto', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['a', 'c', 'b']);

    const series = opt.series as Array<{ type: string; data: number[]; yAxisIndex?: number; itemStyle: { color: string } }>;
    expect(series).toHaveLength(2);

    expect(series[0].type).toBe('bar');
    expect(series[0].data).toEqual([3, 2, 1]);
    expect(series[0].itemStyle.color).toBe('#f00');

    expect(series[1].type).toBe('line');
    expect(series[1].yAxisIndex).toBe(1);
    expect(series[1].itemStyle.color).toBe('#0f0');
    // total = 6 -> cumulative %: 3/6, 5/6, 6/6
    expect(series[1].data[0]).toBeCloseTo(50);
    expect(series[1].data[1]).toBeCloseTo(83.333333);
    expect(series[1].data[2]).toBeCloseTo(100);
  });

  it('provides a left value axis and a right 0..100 percent axis', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b'], val: [4, 6] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'pareto', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    const yAxes = opt.yAxis as Array<Record<string, unknown>>;
    expect(yAxes).toHaveLength(2);
    expect(yAxes[0].type).toBe('value');
    expect(yAxes[0].axisLine).toBeUndefined();
    expect(yAxes[1].type).toBe('value');
    expect(yAxes[1].name).toBe('%');
    expect(yAxes[1].min).toBe(0);
    expect(yAxes[1].max).toBe(100);
  });

  it('drops rows whose value is non-finite before sorting', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [10, NaN, 30] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'pareto', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['c', 'a']);
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([30, 10]);
    expect(series[1].data[series[1].data.length - 1]).toBeCloseTo(100);
  });

  it('renders the empty state when no value is finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a'], val: [Infinity] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'pareto', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    const props = el.props as { message?: string };
    expect(props.message).toBe('No values to chart');
  });

  it('drops non-positive values so the cumulative line never divides by a zero/negative total', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [5, -5, 0] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'pareto', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    // only 'a' (5) survives; -5 and 0 are dropped, so the cumulative line is a finite 100.
    expect((opt.xAxis as { data: string[] }).data).toEqual(['a']);
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([5]);
    expect(series[1].data).toEqual([100]);
  });

  it('renders the empty state when every value is zero or negative', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b'], val: [0, -3] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'pareto', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No values to chart');
  });
});
