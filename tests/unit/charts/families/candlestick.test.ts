import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/candlestick';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('candlestick registration', () => {
  it('registers under type "candlestick" with the finance family', () => {
    const def = chartRegistry.get('candlestick');
    expect(def).toBeDefined();
    expect(def!.family).toBe('finance');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('candlestick buildOption', () => {
  const def = () => chartRegistry.get('candlestick')!;

  it('orders each candle as [open, close, low, high] with a category date axis', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        date: ['2024-01-01', '2024-01-02'],
        open: [10, 12],
        high: [15, 18],
        low: [8, 11],
        close: [12, 17],
      },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'open', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'high', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = {
      chartType: 'candlestick',
      columns: { date: 'date', open: 'open', high: 'high', low: 'low', close: 'close' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01', '2024-01-02']);
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    const series = opt.series as Array<{ type: string; data: number[][] }>;
    expect(series[0].type).toBe('candlestick');
    // [open, close, low, high]
    expect(series[0].data).toEqual([
      [10, 12, 8, 15],
      [12, 17, 11, 18],
    ]);

    const tooltip = opt.tooltip as { trigger: string; axisPointer: { type: string } };
    expect(tooltip.trigger).toBe('axis');
    expect(tooltip.axisPointer.type).toBe('cross');

    const dataZoom = opt.dataZoom as Array<{ type: string; xAxisIndex: number }>;
    expect(dataZoom[0]).toEqual({ type: 'inside', xAxisIndex: 0 });
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = {
      chartType: 'candlestick',
      columns: { date: 'nope_d', open: 'nope_o', high: 'nope_h', low: 'nope_l', close: 'nope_c' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  it('drops rows with any non-finite OHLC value', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        date: ['d1', 'd2', 'd3'],
        open: [10, NaN, 12],
        high: [15, 16, 18],
        low: [8, 9, 11],
        close: [12, 13, 17],
      },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'open', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
        { name: 'high', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = {
      chartType: 'candlestick',
      columns: { date: 'date', open: 'open', high: 'high', low: 'low', close: 'close' },
      options: {},
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['d1', 'd3']);
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([
      [10, 12, 8, 15],
      [12, 17, 11, 18],
    ]);
  });

  it('themes up candles from colorScale[2] and down candles from colorScale[1]', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { date: ['d1'], open: [10], high: [15], low: [8], close: [12] },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'open', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'high', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const cfg: ChartConfig = {
      chartType: 'candlestick',
      columns: { date: 'date', open: 'open', high: 'high', low: 'low', close: 'close' },
      options: {},
    };
    // colorScale has a single entry, so both indices wrap to '#f00' via categoricalColor.
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ itemStyle: { color: string; color0: string; borderColor: string; borderColor0: string } }>;
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[0].itemStyle.color0).toBe('#f00');
    expect(series[0].itemStyle.borderColor).toBe('#f00');
    expect(series[0].itemStyle.borderColor0).toBe('#f00');
  });

  it('renders the empty state when no row has finite OHLC', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { date: ['d1'], open: [NaN], high: [1], low: [1], close: [1] },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'open', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
        { name: 'high', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const cfg: ChartConfig = {
      chartType: 'candlestick',
      columns: { date: 'date', open: 'open', high: 'high', low: 'low', close: 'close' },
      options: {},
    };
    const el = def().createRenderer().render(dv, cfg, theme());
    const props = el.props as { message?: string };
    expect(props.message).toBe('No OHLC rows to chart');
  });
});
