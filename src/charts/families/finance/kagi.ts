import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface KagiPoint {
  index: number;
  price: number;
}

function closeValues(data: DataView, config: ChartConfig): number[] {
  const closes = data.columnArrays[config.columns['close']] ?? [];
  return closes.filter((value): value is number => Number.isFinite(value));
}

function reversalAmount(closes: number[]): number {
  if (closes.length < 2) return 1;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  return Math.max((max - min) * 0.04, 0.01);
}

function kagiSegments(closes: number[]): KagiPoint[][] {
  if (closes.length === 0) return [];
  const reversal = reversalAmount(closes);
  const segments: KagiPoint[][] = [];
  let direction: -1 | 0 | 1 = 0;
  let pivot = closes[0];
  let current: KagiPoint[] = [{ index: 0, price: pivot }];

  for (let i = 1; i < closes.length; i++) {
    const price = closes[i];
    if (direction === 0) {
      const move = price - pivot;
      if (Math.abs(move) >= reversal) direction = move > 0 ? 1 : -1;
      current.push({ index: i, price });
      pivot = price;
      continue;
    }

    const extendsTrend = direction > 0 ? price >= pivot : price <= pivot;
    if (extendsTrend) {
      current.push({ index: i, price });
      pivot = price;
      continue;
    }

    if (Math.abs(price - pivot) >= reversal) {
      segments.push(current);
      current = [{ index: i - 1, price: pivot }, { index: i, price }];
      direction = direction > 0 ? -1 : 1;
      pivot = price;
    }
  }

  segments.push(current);
  return segments;
}

class KagiRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return closeValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No close prices to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const segments = kagiSegments(closeValues(data, config));
    const axes = buildCartesianAxes(theme, { type: 'value', name: 'Observation' }, { type: 'value', axisLine: false, name: 'Price' });
    const up = categoricalColor(theme.colorScale, 2, theme.foreground);
    const down = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: segments.map((segment, index) => {
        const first = segment[0].price;
        const last = segment[segment.length - 1].price;
        const color = last >= first ? up : down;
        return {
          type: 'line',
          name: `Kagi ${index + 1}`,
          data: segment.map((point) => [point.index, point.price]),
          symbol: 'none',
          lineStyle: { color, width: 2.5 },
          itemStyle: { color },
        };
      }),
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'kagi',
  family: 'finance',
  name: 'Kagi',
  description: 'Reversal-based price lines that switch direction only after meaningful moves',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv', 'time_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'close', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Close' },
  ],
  createRenderer: () => new KagiRenderer(),
});
