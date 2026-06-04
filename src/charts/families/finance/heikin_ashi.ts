import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finiteOhlcRows(data: DataView, config: ChartConfig): number[] {
  const open = data.columnArrays[config.columns['open']] ?? [];
  const high = data.columnArrays[config.columns['high']] ?? [];
  const low = data.columnArrays[config.columns['low']] ?? [];
  const close = data.columnArrays[config.columns['close']] ?? [];
  const rows: number[] = [];
  const n = Math.min(open.length, high.length, low.length, close.length);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(open[i]) && Number.isFinite(high[i]) && Number.isFinite(low[i]) && Number.isFinite(close[i])) {
      rows.push(i);
    }
  }
  return rows;
}

function heikinAshiCandles(data: DataView, config: ChartConfig): number[][] {
  const open = data.columnArrays[config.columns['open']] ?? [];
  const high = data.columnArrays[config.columns['high']] ?? [];
  const low = data.columnArrays[config.columns['low']] ?? [];
  const close = data.columnArrays[config.columns['close']] ?? [];
  const rows = finiteOhlcRows(data, config);
  const candles: number[][] = [];
  let previousOpen = 0;
  let previousClose = 0;

  rows.forEach((row, index) => {
    const rawOpen = open[row] as number;
    const rawHigh = high[row] as number;
    const rawLow = low[row] as number;
    const rawClose = close[row] as number;
    const haClose = (rawOpen + rawHigh + rawLow + rawClose) / 4;
    const haOpen = index === 0 ? (rawOpen + rawClose) / 2 : (previousOpen + previousClose) / 2;
    const haHigh = Math.max(rawHigh, haOpen, haClose);
    const haLow = Math.min(rawLow, haOpen, haClose);
    candles.push([haOpen, haClose, haLow, haHigh]);
    previousOpen = haOpen;
    previousClose = haClose;
  });

  return candles;
}

class HeikinAshiRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteOhlcRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No OHLC rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dates = data.columnArrays[config.columns['date']] ?? [];
    const rows = finiteOhlcRows(data, config);
    const labels = rows.map((i) => String(dates[i]));
    const axes = buildCartesianAxes(theme, { type: 'category', data: labels }, { type: 'value', axisLine: false });
    const up = categoricalColor(theme.colorScale, 2, theme.foreground);
    const down = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'cross' } }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'candlestick',
        data: heikinAshiCandles(data, config),
        itemStyle: { color: up, color0: down, borderColor: up, borderColor0: down },
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'heikin_ashi',
  family: 'finance',
  name: 'Heikin-Ashi',
  description: 'Smoothed OHLC candles transformed with the Heikin-Ashi formula',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'open', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Open' },
    { role: 'high', acceptedTypes: ['numeric', 'integer', 'float'], label: 'High' },
    { role: 'low', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Low' },
    { role: 'close', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Close' },
  ],
  createRenderer: () => new HeikinAshiRenderer(),
});
