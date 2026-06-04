import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/seasonal_subseries_plot';
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

const cfg: ChartConfig = { chartType: 'seasonal_subseries_plot', columns: { date: 'date', value: 'value' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['2024-01-01', '2024-01-15', '2024-02-01', 'bad-date'],
      value: [10, 12, 8, 20],
    },
    columns: [
      { name: 'date', type: 'datetime', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'value', type: 'float', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  };
}

describe('seasonal_subseries_plot', () => {
  const renderer = () => chartRegistry.get('seasonal_subseries_plot')!.createRenderer() as EChartsBaseRenderer;

  it('registers date and value roles', () => {
    const def = chartRegistry.get('seasonal_subseries_plot')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'value']);
  });

  it('groups finite dated values by UTC month', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.legend as { data: string[] }).data).toEqual(['Jan', 'Feb']);
    expect((opt.xAxis as { data: string[] }).data).toEqual(['1', '2']);
    const series = opt.series as Array<{ name: string; data: number[]; itemStyle: { color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['Jan', 'Feb']);
    expect(series[0].data).toEqual([10, 12]);
    expect(series[1].data).toEqual([8]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('drops invalid dates and renders an empty state when none remain', () => {
    const empty = view();
    empty.columnArrays.date = ['bad'];
    empty.columnArrays.value = [1];
    const opt = renderer().buildOption(empty, cfg, theme()) as EChartsOption;
    expect(opt.series).toEqual([]);
    const el = chartRegistry.get('seasonal_subseries_plot')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No seasonal values to chart');
  });

  it('falls back to no series when referenced columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect(opt.series).toEqual([]);
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
  });
});
