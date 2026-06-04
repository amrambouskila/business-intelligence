import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface PricePoint {
  date: string;
  close: number;
}

function pricePoints(data: DataView, config: ChartConfig): PricePoint[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const closes = data.columnArrays[config.columns['close']] ?? [];
  const points: PricePoint[] = [];
  for (let i = 0; i < Math.min(dates.length, closes.length); i++) {
    if (Number.isFinite(closes[i])) points.push({ date: String(dates[i]), close: closes[i] as number });
  }
  return points;
}

function brickSize(points: PricePoint[]): number {
  let totalMove = 0;
  let moves = 0;
  for (let i = 1; i < points.length; i++) {
    const move = Math.abs(points[i].close - points[i - 1].close);
    if (move > 0) {
      totalMove += move;
      moves += 1;
    }
  }
  return moves > 0 ? Math.max(totalMove / moves, 0.01) : 1;
}

function renkoCandles(points: PricePoint[]): Array<[number, number, number, number]> {
  if (points.length === 0) return [];
  const size = brickSize(points);
  const bricks: Array<[number, number, number, number]> = [];
  let anchor = points[0].close;

  for (const point of points.slice(1)) {
    let distance = point.close - anchor;
    while (Math.abs(distance) >= size) {
      const next = anchor + Math.sign(distance) * size;
      const low = Math.min(anchor, next);
      const high = Math.max(anchor, next);
      // ECharts candlestick datum order is [open, close, low, high].
      bricks.push([+anchor.toFixed(4), +next.toFixed(4), +low.toFixed(4), +high.toFixed(4)]);
      anchor = next;
      distance = point.close - anchor;
    }
  }
  return bricks;
}

class RenkoRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return renkoCandles(pricePoints(data, config)).length === 0;
  }

  protected emptyMessage(): string {
    return 'No Renko bricks to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const bricks = renkoCandles(pricePoints(data, config));
    const labels = bricks.map((_, index) => String(index + 1));
    const axes = buildCartesianAxes(theme, { type: 'category', data: labels, name: 'Brick' }, { type: 'value', axisLine: false, name: 'Price' });
    const up = categoricalColor(theme.colorScale, 2, theme.foreground);
    const down = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'cross' } }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'candlestick',
        name: 'Renko',
        data: bricks,
        itemStyle: { color: up, color0: down, borderColor: up, borderColor0: down },
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'renko',
  family: 'finance',
  name: 'Renko',
  description: 'Price movement bricks that ignore time and emphasize directional trends',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv', 'time_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'close', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Close' },
  ],
  createRenderer: () => new RenkoRenderer(),
});
