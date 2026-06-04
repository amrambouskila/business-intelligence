import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/return_series_line';
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

function view(dateType: 'date' | 'category' = 'date', returns: unknown[] = [0.01, -0.02, NaN, 0.03]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['d1', 'd2', 'd3', 'd4'], return: returns },
    columns: [
      { name: 'date', type: dateType, nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'return', type: 'float', nullable: true, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  };
}

const config: ChartConfig = { chartType: 'return_series_line', columns: { date: 'date', return: 'return' }, options: {} };

describe('return_series_line', () => {
  it('registers with date and return roles', () => {
    const def = chartRegistry.get('return_series_line')!;
    expect(def.family).toBe('finance');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'return']);
  });

  it('plots finite returns as a symbol-less line', () => {
    const opt = (chartRegistry.get('return_series_line')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    const series = (opt.series as Array<{ type: string; symbol: string; data: unknown[] }>)[0];
    expect(series.type).toBe('line');
    expect(series.symbol).toBe('none');
    expect(series.data).toEqual([['d1', 0.01], ['d2', -0.02], ['d4', 0.03]]);
  });

  it('uses a category axis for non-temporal labels', () => {
    const opt = (chartRegistry.get('return_series_line')!.createRenderer() as EChartsBaseRenderer).buildOption(view('category'), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('category');
  });

  it('falls back to empty points when assigned columns are missing', () => {
    const missingConfig: ChartConfig = { chartType: 'return_series_line', columns: { date: 'missing_date', return: 'missing_return' }, options: {} };
    const opt = (chartRegistry.get('return_series_line')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), missingConfig, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });

  it('renders an empty state when no returns are finite', () => {
    const el = chartRegistry.get('return_series_line')!.createRenderer().render(view('date', [NaN]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No return values to chart');
  });
});
