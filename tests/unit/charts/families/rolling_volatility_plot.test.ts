import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/rolling_volatility_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'rolling_volatility_plot', columns: { date: 'date', rolling_vol: 'rolling_vol' }, options: {} };

function view(type: 'date' | 'category' = 'date', vol: unknown[] = [12, Number.NaN, 18]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 3,
    columnArrays: { date: ['2024-01-01', '2024-01-02', '2024-01-03'], rolling_vol: vol },
    columns: [
      { name: 'date', type, nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'rolling_vol', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
  };
}

describe('rolling_volatility_plot', () => {
  it('registers in the finance family', () => {
    expect(chartRegistry.get('rolling_volatility_plot')!.family).toBe('finance');
  });

  it('plots finite rolling volatility values on a percent axis', () => {
    const opt = (chartRegistry.get('rolling_volatility_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    expect(((opt.yAxis as { axisLabel: { formatter: string } }).axisLabel).formatter).toBe('{value}%');
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([['2024-01-01', 12], ['2024-01-03', 18]]);
  });

  it('uses a category axis for category dates', () => {
    const opt = (chartRegistry.get('rolling_volatility_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view('category'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('category');
  });

  it('renders an empty state when no finite values remain', () => {
    const el = chartRegistry.get('rolling_volatility_plot')!.createRenderer().render(view('date', [NaN]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No rolling volatility values to chart');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = { chartType: 'rolling_volatility_plot', columns: { date: 'missing_date', rolling_vol: 'missing_vol' }, options: {} };
    const el = chartRegistry.get('rolling_volatility_plot')!.createRenderer().render(view(), missing, theme());
    expect((el.props as { message: string }).message).toBe('No rolling volatility values to chart');
  });
});
