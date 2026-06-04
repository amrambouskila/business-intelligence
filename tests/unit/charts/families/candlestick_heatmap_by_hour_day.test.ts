import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/candlestick_heatmap_by_hour_day';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'candlestick_heatmap_by_hour_day', columns: { weekday: 'weekday', hour: 'hour', value: 'value' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 4,
    columnArrays: { weekday: ['Fri', 'Mon', 'Mon', 'Tue'], hour: [10, 9, 10, 9], value: [3, 1, Number.NaN, 2] },
    columns: [],
  };
}

describe('candlestick_heatmap_by_hour_day', () => {
  it('registers weekday/hour/value roles', () => {
    expect(chartRegistry.get('candlestick_heatmap_by_hour_day')!.requiredColumns.map((role) => role.role)).toEqual(['weekday', 'hour', 'value']);
  });

  it('sorts weekdays and hours and builds heatmap cells', () => {
    const opt = (chartRegistry.get('candlestick_heatmap_by_hour_day')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['9', '10']);
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Mon', 'Tue', 'Fri']);
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([[1, 2, 3], [0, 0, 1], [0, 1, 2]]);
    expect((opt.visualMap as { min: number; max: number }).min).toBe(1);
    expect((opt.visualMap as { min: number; max: number }).max).toBe(3);
  });

  it('orders known weekdays before unknown labels and falls back to lexical hour order', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { weekday: ['Market', 'Mon', 'After'], hour: ['close', 'open', 'after'], value: [4, 1, 2] },
      rowCount: 3,
    };
    const opt = (chartRegistry.get('candlestick_heatmap_by_hour_day')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Mon', 'After', 'Market']);
    expect((opt.xAxis as { data: string[] }).data).toEqual(['after', 'close', 'open']);
  });

  it('renders an empty state when no finite values remain', () => {
    const dv: DataView = { ...view(), columnArrays: { weekday: ['Mon'], hour: [9], value: [NaN] }, rowCount: 1 };
    const el = chartRegistry.get('candlestick_heatmap_by_hour_day')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No hour/day heatmap values to chart');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = {
      chartType: 'candlestick_heatmap_by_hour_day',
      columns: { weekday: 'missing_weekday', hour: 'missing_hour', value: 'missing_value' },
      options: {},
    };
    const el = chartRegistry.get('candlestick_heatmap_by_hour_day')!.createRenderer().render(view(), missing, theme());
    expect((el.props as { message: string }).message).toBe('No hour/day heatmap values to chart');
  });
});
