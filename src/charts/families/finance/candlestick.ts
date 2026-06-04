import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/** Row indices whose open/high/low/close are all finite numbers. */
function validRows(data: DataView, config: ChartConfig): number[] {
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

class CandlestickRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return validRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No OHLC rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dates = data.columnArrays[config.columns['date']] ?? [];
    const open = data.columnArrays[config.columns['open']] ?? [];
    const high = data.columnArrays[config.columns['high']] ?? [];
    const low = data.columnArrays[config.columns['low']] ?? [];
    const close = data.columnArrays[config.columns['close']] ?? [];

    const rows = validRows(data, config);
    // ECharts candlestick datum order is [open, close, low, high].
    const candles = rows.map((i) => [open[i] as number, close[i] as number, low[i] as number, high[i] as number]);
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
        data: candles,
        itemStyle: { color: up, color0: down, borderColor: up, borderColor0: down },
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'candlestick',
  family: 'finance',
  name: 'Candlestick',
  description: 'OHLC candles showing open, high, low, and close per period',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'open', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Open' },
    { role: 'high', acceptedTypes: ['numeric', 'integer', 'float'], label: 'High' },
    { role: 'low', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Low' },
    { role: 'close', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Close' },
  ],
  createRenderer: () => new CandlestickRenderer(),
});
