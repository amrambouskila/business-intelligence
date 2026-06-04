import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type Mark = 'X' | 'O';
type BoxPoint = [number, number, Mark];

function closeValues(data: DataView, config: ChartConfig): number[] {
  const closes = data.columnArrays[config.columns['close']] ?? [];
  return closes.filter((value): value is number => Number.isFinite(value));
}

function boxSize(closes: number[]): number {
  if (closes.length < 2) return 1;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  return Math.max((max - min) / 24, 0.01);
}

function pointAndFigureBoxes(closes: number[]): BoxPoint[] {
  if (closes.length === 0) return [];
  const size = boxSize(closes);
  const boxes: BoxPoint[] = [];
  let column = 0;
  let direction: Mark | null = null;
  let level = Math.round(closes[0] / size);

  for (const close of closes.slice(1)) {
    const nextLevel = Math.round(close / size);
    const delta = nextLevel - level;
    if (direction == null) {
      if (Math.abs(delta) < 1) continue;
      direction = delta > 0 ? 'X' : 'O';
    }

    const sameDirection = direction === 'X' ? delta > 0 : delta < 0;
    if (sameDirection) {
      const step = direction === 'X' ? 1 : -1;
      for (let priceLevel = level + step; direction === 'X' ? priceLevel <= nextLevel : priceLevel >= nextLevel; priceLevel += step) {
        boxes.push([column, priceLevel, direction]);
      }
      level = nextLevel;
      continue;
    }

    if (Math.abs(delta) >= 3) {
      column += 1;
      direction = direction === 'X' ? 'O' : 'X';
      const step = direction === 'X' ? 1 : -1;
      for (let priceLevel = level + step; direction === 'X' ? priceLevel <= nextLevel : priceLevel >= nextLevel; priceLevel += step) {
        boxes.push([column, priceLevel, direction]);
      }
      level = nextLevel;
    }
  }

  return boxes;
}

function markFormatter(params: { data?: unknown }): string {
  const data = params.data;
  return Array.isArray(data) && typeof data[2] === 'string' ? data[2] : '';
}

class PointAndFigureRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return pointAndFigureBoxes(closeValues(data, config)).length === 0;
  }

  protected emptyMessage(): string {
    return 'No point-and-figure boxes to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const boxes = pointAndFigureBoxes(closeValues(data, config));
    const xBoxes = boxes.filter((box) => box[2] === 'X');
    const oBoxes = boxes.filter((box) => box[2] === 'O');
    const axes = buildCartesianAxes(theme, { type: 'value', name: 'Column' }, { type: 'value', axisLine: false, name: 'Price box' });
    const up = categoricalColor(theme.colorScale, 2, theme.foreground);
    const down = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'scatter',
          name: 'Rising',
          data: xBoxes,
          symbolSize: 22,
          itemStyle: { color: up },
          label: { show: true, formatter: markFormatter, color: theme.background, fontWeight: 700 },
        },
        {
          type: 'scatter',
          name: 'Falling',
          data: oBoxes,
          symbolSize: 22,
          itemStyle: { color: down },
          label: { show: true, formatter: markFormatter, color: theme.background, fontWeight: 700 },
        },
      ],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'point_and_figure',
  family: 'finance',
  name: 'Point-and-Figure',
  description: 'Columnar X/O price boxes that filter out small movements',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv', 'time_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'close', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Close' },
  ],
  createRenderer: () => new PointAndFigureRenderer(),
});
