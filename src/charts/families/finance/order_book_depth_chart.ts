import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface DepthRow {
  price: number;
  bidSize: number;
  askSize: number;
}

function finiteRows(data: DataView, config: ChartConfig): DepthRow[] {
  const prices = data.columnArrays[config.columns['price']] ?? [];
  const bids = data.columnArrays[config.columns['bid_size']] ?? [];
  const asks = data.columnArrays[config.columns['ask_size']] ?? [];
  const rows: DepthRow[] = [];
  const n = Math.min(prices.length, bids.length, asks.length);

  for (let i = 0; i < n; i++) {
    const price = prices[i];
    const bidSize = bids[i];
    const askSize = asks[i];
    if (
      typeof price === 'number' && Number.isFinite(price)
      && typeof bidSize === 'number' && Number.isFinite(bidSize)
      && typeof askSize === 'number' && Number.isFinite(askSize)
    ) {
      rows.push({ price, bidSize: Math.max(0, bidSize), askSize: Math.max(0, askSize) });
    }
  }

  return rows.sort((a, b) => a.price - b.price);
}

function cumulativeBid(rows: DepthRow[]): Array<[number, number]> {
  let total = 0;
  const points: Array<[number, number]> = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    total += rows[i].bidSize;
    points.push([rows[i].price, total]);
  }
  return points.reverse();
}

function cumulativeAsk(rows: DepthRow[]): Array<[number, number]> {
  let total = 0;
  return rows.map((row) => {
    total += row.askSize;
    return [row.price, total] as [number, number];
  });
}

class OrderBookDepthChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No order book depth values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = finiteRows(data, config);
    const bidColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const askColor = categoricalColor(theme.colorScale, 1, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['price'], nameGap: 30 },
      { type: 'value', name: 'Cumulative size', nameGap: 48, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      legend: { top: 0, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Bid depth',
          type: 'line',
          data: cumulativeBid(rows),
          showSymbol: false,
          lineStyle: { color: bidColor, width: 2 },
          itemStyle: { color: bidColor },
          areaStyle: { color: bidColor, opacity: 0.14 },
        },
        {
          name: 'Ask depth',
          type: 'line',
          data: cumulativeAsk(rows),
          showSymbol: false,
          lineStyle: { color: askColor, width: 2 },
          itemStyle: { color: askColor },
          areaStyle: { color: askColor, opacity: 0.14 },
        },
      ],
      grid: buildGrid({ top: 40, bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'order_book_depth_chart',
  family: 'finance',
  name: 'Order Book Depth Chart',
  description: 'Cumulative bid and ask liquidity across price levels',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'generic'],
  requiredColumns: [
    { role: 'price', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Price' },
    { role: 'bid_size', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Bid Size' },
    { role: 'ask_size', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Ask Size' },
  ],
  createRenderer: () => new OrderBookDepthChartRenderer(),
});
