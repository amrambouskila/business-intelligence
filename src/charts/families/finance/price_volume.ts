import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function validRows(data: DataView, config: ChartConfig): number[] {
  const open = data.columnArrays[config.columns['open']] ?? [];
  const high = data.columnArrays[config.columns['high']] ?? [];
  const low = data.columnArrays[config.columns['low']] ?? [];
  const close = data.columnArrays[config.columns['close']] ?? [];
  const volume = data.columnArrays[config.columns['volume']] ?? [];
  const rows: number[] = [];
  const n = Math.min(open.length, high.length, low.length, close.length, volume.length);
  for (let i = 0; i < n; i++) {
    if (
      Number.isFinite(open[i]) &&
      Number.isFinite(high[i]) &&
      Number.isFinite(low[i]) &&
      Number.isFinite(close[i]) &&
      Number.isFinite(volume[i])
    ) {
      rows.push(i);
    }
  }
  return rows;
}

class PriceVolumeRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return validRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No OHLCV rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dates = data.columnArrays[config.columns['date']] ?? [];
    const open = data.columnArrays[config.columns['open']] ?? [];
    const high = data.columnArrays[config.columns['high']] ?? [];
    const low = data.columnArrays[config.columns['low']] ?? [];
    const close = data.columnArrays[config.columns['close']] ?? [];
    const volume = data.columnArrays[config.columns['volume']] ?? [];
    const rows = validRows(data, config);
    const labels = rows.map((i) => String(dates[i]));
    const candles = rows.map((i) => [open[i] as number, close[i] as number, low[i] as number, high[i] as number]);
    const volumes = rows.map((i) => volume[i] as number);
    const priceAxes = buildCartesianAxes(theme, { type: 'category', data: labels }, { type: 'value', axisLine: false });
    const volumeAxes = buildCartesianAxes(theme, { type: 'category', data: labels }, { type: 'value', axisLine: false });
    const up = categoricalColor(theme.colorScale, 2, theme.foreground);
    const down = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'cross' } }),
      xAxis: [
        { ...priceAxes.xAxis, gridIndex: 0 },
        { ...volumeAxes.xAxis, gridIndex: 1 },
      ],
      yAxis: [
        { ...priceAxes.yAxis, gridIndex: 0, scale: true },
        { ...volumeAxes.yAxis, gridIndex: 1 },
      ],
      grid: [
        { left: 60, right: 20, top: 20, height: '58%' },
        { left: 60, right: 20, bottom: 35, height: '18%' },
      ],
      series: [
        {
          type: 'candlestick',
          name: 'Price',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: candles,
          itemStyle: { color: up, color0: down, borderColor: up, borderColor0: down },
        },
        {
          type: 'bar',
          name: 'Volume',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        },
      ],
      dataZoom: [{ type: 'inside', xAxisIndex: [0, 1] }],
    };
  }
}

chartRegistry.register({
  type: 'price_volume',
  family: 'finance',
  name: 'Price + Volume Dashboard',
  description: 'OHLC candlesticks with aligned volume bars underneath',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'open', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Open' },
    { role: 'high', acceptedTypes: ['numeric', 'integer', 'float'], label: 'High' },
    { role: 'low', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Low' },
    { role: 'close', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Close' },
    { role: 'volume', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Volume' },
  ],
  createRenderer: () => new PriceVolumeRenderer(),
});
