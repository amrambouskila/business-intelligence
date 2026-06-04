import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/order_book_depth_chart';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#0f0', '#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'order_book_depth_chart', columns: { price: 'price', bid_size: 'bid_size', ask_size: 'ask_size' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 4,
    columnArrays: { price: [101, 100, 102, 'bad'], bid_size: [2, 5, -1, 3], ask_size: [1, 4, 6, 9] },
    columns: [],
  };
}

describe('order_book_depth_chart', () => {
  it('registers bid and ask depth roles', () => {
    expect(chartRegistry.get('order_book_depth_chart')!.requiredColumns.map((role) => role.role)).toEqual(['price', 'bid_size', 'ask_size']);
  });

  it('sorts price levels and builds cumulative bid/ask depth', () => {
    const opt = (chartRegistry.get('order_book_depth_chart')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[][] }>;
    expect(series[0].name).toBe('Bid depth');
    expect(series[0].data).toEqual([[100, 7], [101, 2], [102, 0]]);
    expect(series[1].data).toEqual([[100, 4], [101, 5], [102, 11]]);
  });

  it('renders an empty state when no finite rows remain', () => {
    const dv: DataView = { ...view(), columnArrays: { price: ['bad'], bid_size: [1], ask_size: [2] }, rowCount: 1 };
    const el = chartRegistry.get('order_book_depth_chart')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No order book depth values to chart');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = {
      chartType: 'order_book_depth_chart',
      columns: { price: 'missing_price', bid_size: 'missing_bid', ask_size: 'missing_ask' },
      options: {},
    };
    const el = chartRegistry.get('order_book_depth_chart')!.createRenderer().render(view(), missing, theme());
    expect((el.props as { message: string }).message).toBe('No order book depth values to chart');
  });
});
