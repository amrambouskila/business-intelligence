import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/calendar_matrix';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'calendar_matrix', columns: { date: 'date', value: 'value' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['2024-01-01', '2024-01-07', 'bad', '2024-01-08'],
      value: [10, 20, 99, 30],
    },
    columns: [
      { name: 'date', type: 'datetime', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  };
}

describe('calendar_matrix', () => {
  const renderer = () => chartRegistry.get('calendar_matrix')!.createRenderer() as EChartsBaseRenderer;

  it('registers date and value roles', () => {
    const def = chartRegistry.get('calendar_matrix')!;
    expect(def.family).toBe('matrix');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'value']);
  });

  it('renders dates into week-by-weekday heatmap cells using UTC days', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['W1', 'W2']);
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const series = opt.series as Array<{ data: Array<[number, number, number]>; itemStyle: { borderColor: string } }>;
    expect(series[0].data).toEqual([[0, 1, 10], [1, 0, 20], [1, 1, 30]]);
    expect(series[0].itemStyle.borderColor).toBe('#000');
    expect((opt.visualMap as { min: number; max: number }).max).toBe(30);
  });

  it('derives min and max from non-monotonic calendar values', () => {
    const dv = view();
    dv.columnArrays.value = [30, 10, 99, 20];
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect(opt.visualMap as { min: number; max: number }).toMatchObject({ min: 10, max: 30 });
  });

  it('renders empty options and empty state when no valid dated values remain', () => {
    const empty = view();
    empty.columnArrays.date = ['bad', '2024-01-01', '2024-01-02'];
    empty.columnArrays.value = [1, 'x', Infinity];
    const opt = renderer().buildOption(empty, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    const el = chartRegistry.get('calendar_matrix')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No calendar values to chart');
  });

  it('falls back to empty cells when role columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
  });
});
