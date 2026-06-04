import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/control_chart';
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

const cfg: ChartConfig = { chartType: 'control_chart', columns: { date: 'date', value: 'value', ucl: 'ucl', lcl: 'lcl' }, options: {} };

function view(dateType: 'datetime' | 'category' = 'datetime'): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['2024-01-01', '2024-01-02', '2024-01-03'], value: [50, NaN, 52], ucl: [60, 60, 60], lcl: [40, 40, 40] },
    columns: [
      { name: 'date', type: dateType, nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'value', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
      { name: 'ucl', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
      { name: 'lcl', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('control_chart', () => {
  const renderer = () => chartRegistry.get('control_chart')!.createRenderer() as EChartsBaseRenderer;

  it('registers required process-control roles', () => {
    const def = chartRegistry.get('control_chart')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'value', 'ucl', 'lcl']);
  });

  it('renders value, upper-limit, and lower-limit series after filtering incomplete rows', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    expect((opt.legend as { data: string[]; bottom: number }).data).toEqual(['Value', 'UCL', 'LCL']);
    const series = opt.series as Array<{ name: string; data: unknown[]; lineStyle: { color: string; type?: string } }>;
    expect(series.map((s) => s.name)).toEqual(['Value', 'UCL', 'LCL']);
    expect(series[0].data).toEqual([['2024-01-01', 50], ['2024-01-03', 52]]);
    expect(series[1].data).toEqual([['2024-01-01', 60], ['2024-01-03', 60]]);
    expect(series[2].data).toEqual([['2024-01-01', 40], ['2024-01-03', 40]]);
    expect(series[1].lineStyle.type).toBe('dashed');
    expect(series[0].lineStyle.color).toBe('#f00');
  });

  it('uses category-axis arrays when the date column is not temporal', () => {
    const opt = renderer().buildOption(view('category'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01', '2024-01-03']);
    expect((opt.series as Array<{ data: number[] }>)[0].data).toEqual([50, 52]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[1].data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[2].data).toEqual([]);
  });

  it('drops rows with non-finite upper or lower limits', () => {
    const dv = view('category');
    dv.columnArrays.value = [50, 51, 52];
    dv.columnArrays.ucl = [60, NaN, 60];
    dv.columnArrays.lcl = [40, 40, NaN];
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: number[] }>)[0].data).toEqual([50]);
  });

  it('renders an empty state when no row has all finite numeric roles', () => {
    const empty = view();
    empty.columnArrays.value = [NaN];
    const el = chartRegistry.get('control_chart')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No control rows to chart');
  });
});
