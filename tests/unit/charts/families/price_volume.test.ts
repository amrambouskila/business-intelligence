import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/price_volume';
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

function view(volume: unknown[] = [1000, 2000]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['d1', 'd2'],
      open: [10, 12],
      high: [14, 15],
      low: [9, 11],
      close: [12, 11],
      volume,
    },
    columns: [
      { name: 'date', type: 'date', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'open', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'high', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'low', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'close', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'volume', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
    ],
    rowCount: 2,
  };
}

const config: ChartConfig = {
  chartType: 'price_volume',
  columns: { date: 'date', open: 'open', high: 'high', low: 'low', close: 'close', volume: 'volume' },
  options: {},
};

describe('price_volume', () => {
  it('registers as an OHLCV finance chart', () => {
    const def = chartRegistry.get('price_volume')!;
    expect(def.family).toBe('finance');
    expect(def.compatibleShapes).toEqual(['ohlcv']);
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'open', 'high', 'low', 'close', 'volume']);
  });

  it('emits aligned candlestick and volume panels', () => {
    const opt = (chartRegistry.get('price_volume')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; name: string; data: unknown[]; xAxisIndex: number; yAxisIndex: number }>;
    expect(series[0]).toMatchObject({ type: 'candlestick', name: 'Price', xAxisIndex: 0, yAxisIndex: 0 });
    expect(series[0].data).toEqual([[10, 12, 9, 14], [12, 11, 11, 15]]);
    expect(series[1]).toMatchObject({ type: 'bar', name: 'Volume', xAxisIndex: 1, yAxisIndex: 1 });
    expect(series[1].data).toEqual([1000, 2000]);
    expect(opt.grid as unknown[]).toHaveLength(2);
    expect((opt.dataZoom as Array<{ xAxisIndex: number[] }>)[0].xAxisIndex).toEqual([0, 1]);
  });

  it('drops rows with non-finite volume or price fields', () => {
    const dv = view([1000, NaN]);
    dv.columnArrays.open = [10, NaN, 11, 12, 13];
    dv.columnArrays.high = [14, 15, NaN, 16, 17];
    dv.columnArrays.low = [9, 11, 10, NaN, 12];
    dv.columnArrays.close = [12, 11, 12, 13, NaN];
    dv.columnArrays.volume = [1000, 2000, 3000, 4000, NaN];
    const opt = (chartRegistry.get('price_volume')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([[10, 12, 9, 14]]);
    expect(series[1].data).toEqual([1000]);
  });

  it('falls back to empty arrays when assigned columns are missing', () => {
    const missingConfig: ChartConfig = {
      chartType: 'price_volume',
      columns: {
        date: 'missing_date',
        open: 'missing_open',
        high: 'missing_high',
        low: 'missing_low',
        close: 'missing_close',
        volume: 'missing_volume',
      },
      options: {},
    };
    const opt = (chartRegistry.get('price_volume')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), missingConfig, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });

  it('renders an empty state when no OHLCV row is finite', () => {
    const el = chartRegistry.get('price_volume')!.createRenderer().render(view([NaN, NaN]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No OHLCV rows to chart');
  });
});
