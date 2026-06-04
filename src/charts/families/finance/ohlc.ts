import type { EChartsOption, CustomSeriesRenderItem } from 'echarts';
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

/**
 * Draw an OHLC bar: a vertical low->high line, a left tick at open, a right tick at close.
 * Each datum is [categoryIndex, open, high, low, close]; tick length is half the band width.
 */
function ohlcRenderItem(upColor: string, downColor: string): CustomSeriesRenderItem {
  return (_params, api) => {
    const categoryIndex = api.value(0);
    const openVal = api.value(1);
    const closeVal = api.value(4);
    const x = api.coord([categoryIndex, api.value(3)])[0];
    const yLow = api.coord([categoryIndex, api.value(3)])[1];
    const yHigh = api.coord([categoryIndex, api.value(2)])[1];
    const yOpen = api.coord([categoryIndex, openVal])[1];
    const yClose = api.coord([categoryIndex, closeVal])[1];
    const bandSize = api.size?.([1, 0]) ?? [0, 0];
    const tick = (Array.isArray(bandSize) ? bandSize[0] : bandSize) / 2;
    const color = closeVal >= openVal ? upColor : downColor;
    return {
      type: 'group',
      children: [
        { type: 'line', shape: { x1: x, y1: yLow, x2: x, y2: yHigh }, style: { stroke: color, lineWidth: 1.5 } },
        { type: 'line', shape: { x1: x - tick, y1: yOpen, x2: x, y2: yOpen }, style: { stroke: color, lineWidth: 1.5 } },
        { type: 'line', shape: { x1: x, y1: yClose, x2: x + tick, y2: yClose }, style: { stroke: color, lineWidth: 1.5 } },
      ],
    };
  };
}

class OhlcRenderer extends EChartsBaseRenderer {
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
    const labels = rows.map((i) => String(dates[i]));
    const bars = rows.map((i, idx) => [
      idx,
      open[i] as number,
      high[i] as number,
      low[i] as number,
      close[i] as number,
    ]);

    const axes = buildCartesianAxes(theme, { type: 'category', data: labels }, { type: 'value', axisLine: false });
    const up = categoricalColor(theme.colorScale, 2, theme.foreground);
    const down = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'cross' } }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'custom',
        renderItem: ohlcRenderItem(up, down),
        encode: { x: 0, y: [1, 2, 3, 4] },
        data: bars,
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'ohlc',
  family: 'finance',
  name: 'OHLC Chart',
  description: 'Open-high-low-close bars (tick marks) per period',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'open', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Open' },
    { role: 'high', acceptedTypes: ['numeric', 'integer', 'float'], label: 'High' },
    { role: 'low', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Low' },
    { role: 'close', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Close' },
  ],
  createRenderer: () => new OhlcRenderer(),
});
