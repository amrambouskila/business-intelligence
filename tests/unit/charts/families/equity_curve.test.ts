import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/equity_curve';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(dateType: 'date' | 'category' = 'date', equity: unknown[] = [100, 110, NaN, 120]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['d1', 'd2', 'd3', 'd4'], equity },
    columns: [
      { name: 'date', type: dateType, nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'equity', type: 'float', nullable: true, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  };
}

const config: ChartConfig = { chartType: 'equity_curve', columns: { date: 'date', equity: 'equity' }, options: {} };

describe('equity_curve', () => {
  it('registers with date and equity roles', () => {
    const def = chartRegistry.get('equity_curve')!;
    expect(def.family).toBe('finance');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'equity']);
  });

  it('plots finite equity points on a time axis', () => {
    const opt = (chartRegistry.get('equity_curve')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    const series = (opt.series as Array<{ type: string; smooth: boolean; data: unknown[]; lineStyle: { color: string } }>)[0];
    expect(series.type).toBe('line');
    expect(series.smooth).toBe(true);
    expect(series.data).toEqual([['d1', 100], ['d2', 110], ['d4', 120]]);
    expect(series.lineStyle.color).toBe('#f00');
  });

  it('uses a category axis for non-temporal labels', () => {
    const opt = (chartRegistry.get('equity_curve')!.createRenderer() as EChartsBaseRenderer).buildOption(view('category'), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('category');
  });

  it('falls back to empty points when assigned columns are missing', () => {
    const missingConfig: ChartConfig = { chartType: 'equity_curve', columns: { date: 'missing_date', equity: 'missing_equity' }, options: {} };
    const opt = (chartRegistry.get('equity_curve')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), missingConfig, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });

  it('renders an empty state when no equity values are finite', () => {
    const el = chartRegistry.get('equity_curve')!.createRenderer().render(view('date', [NaN]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No equity values to chart');
  });
});
