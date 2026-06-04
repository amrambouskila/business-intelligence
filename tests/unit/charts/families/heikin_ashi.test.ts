import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/heikin_ashi';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(open: unknown[] = [10, 12, 11]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['d1', 'd2', 'd3'],
      open,
      high: [14, 15, 13],
      low: [9, 11, 10],
      close: [12, 11, 12],
    },
    columns: [
      { name: 'date', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'open', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'high', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'low', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'close', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

const config: ChartConfig = {
  chartType: 'heikin_ashi',
  columns: { date: 'date', open: 'open', high: 'high', low: 'low', close: 'close' },
  options: {},
};

describe('heikin_ashi', () => {
  it('registers as a finance ECharts chart requiring OHLC columns', () => {
    const def = chartRegistry.get('heikin_ashi')!;
    expect(def.family).toBe('finance');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'open', 'high', 'low', 'close']);
  });

  it('transforms raw OHLC rows into Heikin-Ashi candlestick data', () => {
    const opt = (chartRegistry.get('heikin_ashi')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), config, theme()) as EChartsOption;
    const series = (opt.series as Array<{ type: string; data: number[][]; itemStyle: { color: string; color0: string } }>)[0];
    expect(series.type).toBe('candlestick');
    expect(series.data).toEqual([
      [11, 11.25, 9, 14],
      [11.125, 12.25, 11, 15],
      [11.6875, 11.5, 10, 13],
    ]);
    expect(series.itemStyle.color).toBe('#00f');
    expect(series.itemStyle.color0).toBe('#0f0');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['d1', 'd2', 'd3']);
  });

  it('drops non-finite OHLC rows before transforming', () => {
    const dv = view([10, NaN, 11]);
    dv.columnArrays.high = [14, 15, NaN];
    dv.columnArrays.low = [9, NaN, 10];
    dv.columnArrays.close = [12, 11, NaN];
    const opt = (chartRegistry.get('heikin_ashi')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    const series = (opt.series as Array<{ data: number[][] }>)[0];
    expect(series.data).toEqual([
      [11, 11.25, 9, 14],
    ]);
  });

  it('falls back to empty arrays when assigned columns are missing', () => {
    const missingConfig: ChartConfig = {
      chartType: 'heikin_ashi',
      columns: { date: 'missing_date', open: 'missing_open', high: 'missing_high', low: 'missing_low', close: 'missing_close' },
      options: {},
    };
    const opt = (chartRegistry.get('heikin_ashi')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), missingConfig, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });

  it('renders an empty state when no OHLC row is finite', () => {
    const el = chartRegistry.get('heikin_ashi')!.createRenderer().render(view([NaN, NaN, NaN]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No OHLC rows to chart');
  });
});
