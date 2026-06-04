import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/calendar_heatmap';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { ColumnMeta, DataView } from '@/types/data';
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

function meta(name: string, type: ColumnMeta['type'], uniqueCount: number): ColumnMeta {
  return { name, type, nullable: false, uniqueCount, nullCount: 0 };
}

function view(date: unknown[], value: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date, value },
    columns: [meta('date', 'date', date.length), meta('value', 'integer', value.length)],
    rowCount: date.length,
  };
}

const cfg = (): ChartConfig => ({
  chartType: 'calendar_heatmap', columns: { date: 'date', value: 'value' }, options: {},
});

const renderer = () => chartRegistry.get('calendar_heatmap')!.createRenderer() as EChartsBaseRenderer;

describe('calendar_heatmap registration', () => {
  it('registers under type "calendar_heatmap" in the time-series family', () => {
    const def = chartRegistry.get('calendar_heatmap');
    expect(def).toBeDefined();
    expect(def!.family).toBe('time-series');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['date', 'value']);
  });
});

describe('calendar_heatmap buildOption', () => {
  it('builds a calendar heatmap series with [isoDate, value] pairs', () => {
    const dv = view(['2023-01-15', '2023-06-20', '2023-12-31'], [10, 50, 30]);
    const opt = renderer().buildOption(dv, cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; coordinateSystem: string; data: [string, number][] }>;
    expect(series[0].type).toBe('heatmap');
    expect(series[0].coordinateSystem).toBe('calendar');
    expect(series[0].data).toEqual([['2023-01-15', 10], ['2023-06-20', 50], ['2023-12-31', 30]]);
  });

  it('derives visualMap min/max from finite values and uses the sequential palette', () => {
    const dv = view(['2023-01-15', '2023-06-20', '2023-12-31'], [10, 50, 30]);
    const opt = renderer().buildOption(dv, cfg(), theme()) as EChartsOption;
    const vm = opt.visualMap as { min: number; max: number; inRange: { color: string[] }; textStyle: { color: string } };
    expect(vm.min).toBe(10);
    expect(vm.max).toBe(50);
    expect(vm.inRange.color).toEqual(['#000', '#fff']);
    expect(vm.textStyle.color).toBe('#666');
  });

  it('uses a single-year string range when all dates share a year', () => {
    const dv = view(['2023-01-15', '2023-12-31'], [10, 30]);
    const opt = renderer().buildOption(dv, cfg(), theme()) as EChartsOption;
    const calendar = opt.calendar as { range: string | string[] };
    expect(calendar.range).toBe('2023');
  });

  it('uses a [minYear, maxYear] range when dates span multiple years', () => {
    const dv = view(['2021-03-01', '2023-09-09'], [5, 15]);
    const opt = renderer().buildOption(dv, cfg(), theme()) as EChartsOption;
    const calendar = opt.calendar as { range: string | string[] };
    expect(calendar.range).toEqual(['2021', '2023']);
  });

  it('themes the calendar splitLine and item border from gridColor', () => {
    const dv = view(['2023-01-15'], [10]);
    const opt = renderer().buildOption(dv, cfg(), theme()) as EChartsOption;
    const calendar = opt.calendar as {
      splitLine: { lineStyle: { color: string } };
      itemStyle: { borderColor: string };
    };
    expect(calendar.splitLine.lineStyle.color).toBe('#333');
    expect(calendar.itemStyle.borderColor).toBe('#333');
  });

  it('drops rows with non-finite values and unparseable dates', () => {
    const dv = view(
      ['2023-01-15', 'not-a-date', '2023-03-03', '2023-04-04'],
      [10, 20, Number.NaN, 40],
    );
    const opt = renderer().buildOption(dv, cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: [string, number][] }>;
    expect(series[0].data).toEqual([['2023-01-15', 10], ['2023-04-04', 40]]);
    const vm = opt.visualMap as { min: number; max: number };
    expect(vm.min).toBe(10);
    expect(vm.max).toBe(40);
  });
});

describe('calendar_heatmap empty state', () => {
  it('renders the empty message when no finite-value dated rows exist', () => {
    const dv = view(['bad-date', '2023-02-02'], [Number.POSITIVE_INFINITY, Number.NaN]);
    const el = renderer().render(dv, cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No dated values to chart');
  });

  it('renders the empty message when the dataset is empty', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = renderer().render(dv, cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No dated values to chart');
  });
});
