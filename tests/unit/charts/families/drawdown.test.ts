import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/drawdown';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(dateType: 'date' | 'category' = 'date', equity: unknown[] = [100, 80, 120, 90, NaN]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['d1', 'd2', 'd3', 'd4', 'd5'], equity },
    columns: [
      { name: 'date', type: dateType, nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'equity', type: 'float', nullable: true, uniqueCount: 5, nullCount: 0 },
    ],
    rowCount: 5,
  };
}

const config: ChartConfig = { chartType: 'drawdown', columns: { date: 'date', equity: 'equity' }, options: {} };

describe('drawdown', () => {
  it('registers with date and equity roles', () => {
    const def = chartRegistry.get('drawdown')!;
    expect(def.family).toBe('finance');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'equity']);
  });

  it('computes percent drawdown from the running peak', () => {
    const opt = (chartRegistry.get('drawdown')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    const series = (opt.series as Array<{ type: string; data: unknown[]; areaStyle: { color: string; opacity: number } }>)[0];
    expect(series.type).toBe('line');
    expect(series.data).toEqual([['d1', 0], ['d2', -20], ['d3', 0], ['d4', -25]]);
    expect(series.areaStyle).toEqual({ color: '#0f0', opacity: 0.18 });
    expect(((opt.yAxis as { axisLabel: { formatter: string } }).axisLabel).formatter).toBe('{value}%');
  });

  it('uses zero drawdown when the running peak is not positive', () => {
    const opt = (chartRegistry.get('drawdown')!.createRenderer() as EChartsBaseRenderer).buildOption(view('date', [-10, -20]), config, theme()) as EChartsOption;
    const series = (opt.series as Array<{ data: unknown[] }>)[0];
    expect(series.data).toEqual([['d1', 0], ['d2', 0]]);
  });

  it('uses a category axis for non-temporal labels', () => {
    const opt = (chartRegistry.get('drawdown')!.createRenderer() as EChartsBaseRenderer).buildOption(view('category'), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('category');
  });

  it('falls back to empty points when assigned columns are missing', () => {
    const missingConfig: ChartConfig = { chartType: 'drawdown', columns: { date: 'missing_date', equity: 'missing_equity' }, options: {} };
    const opt = (chartRegistry.get('drawdown')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), missingConfig, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });

  it('renders an empty state when no equity values are finite', () => {
    const el = chartRegistry.get('drawdown')!.createRenderer().render(view('date', [NaN]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No equity values to chart');
  });
});
