import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/fan_chart';
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

const cfg: ChartConfig = {
  chartType: 'fan_chart',
  columns: { date: 'date', p10: 'p10', p25: 'p25', p50: 'p50', p75: 'p75', p90: 'p90' },
  options: {},
};

function view(dateType: 'datetime' | 'category' = 'datetime'): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['2024-01-01', '2024-01-02', '2024-01-03'],
      p10: [1, 2, NaN],
      p25: [2, 3, 4],
      p50: [3, 4, 5],
      p75: [4, 5, 6],
      p90: [5, 6, 7],
    },
    columns: [
      { name: 'date', type: dateType, nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'p10', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
      { name: 'p25', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'p50', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'p75', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'p90', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('fan_chart', () => {
  const renderer = () => chartRegistry.get('fan_chart')!.createRenderer() as EChartsBaseRenderer;

  it('registers forecast quantile roles', () => {
    const def = chartRegistry.get('fan_chart')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'p10', 'p25', 'p50', 'p75', 'p90']);
  });

  it('renders the five quantile line series and drops incomplete rows', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    expect((opt.legend as { data: string[]; bottom: number }).data).toEqual(['p10', 'p25', 'p50', 'p75', 'p90']);
    const series = opt.series as Array<{ name: string; data: unknown[]; lineStyle: { color: string; type?: string; width: number } }>;
    expect(series.map((s) => s.name)).toEqual(['p10', 'p25', 'p50', 'p75', 'p90']);
    expect(series[0].data).toEqual([['2024-01-01', 1], ['2024-01-02', 2]]);
    expect(series[2].data).toEqual([['2024-01-01', 3], ['2024-01-02', 4]]);
    expect(series[0].lineStyle.type).toBe('dashed');
    expect(series[2].lineStyle.color).toBe('#f00');
    expect(series[2].lineStyle.width).toBe(2.5);
  });

  it('uses category-axis arrays when the date column is not temporal', () => {
    const opt = renderer().buildOption(view('category'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01', '2024-01-02']);
    expect((opt.series as Array<{ data: number[] }>)[2].data).toEqual([3, 4]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[4].data).toEqual([]);
  });

  it('drops rows with any incomplete quantile role', () => {
    const dv = view('category');
    dv.columnArrays.p10 = [1, 2, 3, 4, 5];
    dv.columnArrays.p25 = [2, NaN, 4, 5, 6];
    dv.columnArrays.p50 = [3, 4, 'bad', 6, 7];
    dv.columnArrays.p75 = [4, 5, 6, Infinity, 8];
    dv.columnArrays.p90 = [5, 6, 7, 8, 9];
    dv.columnArrays.date = ['a', 'b', 'c', 'd', 'e'];
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: number[] }>)[2].data).toEqual([3, 7]);
  });

  it('renders an empty state when no complete quantile row exists', () => {
    const empty = view();
    empty.columnArrays.p10 = [NaN];
    const el = chartRegistry.get('fan_chart')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No forecast quantiles to chart');
  });
});
