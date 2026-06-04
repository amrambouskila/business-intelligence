import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/horizon_chart';
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

const cfg: ChartConfig = { chartType: 'horizon_chart', columns: { date: 'date', value: 'value' }, options: {} };

function view(type: 'datetime' | 'category' = 'datetime'): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['2024-01-01', '2024-01-02', '2024-01-03'], value: [10, NaN, 16] },
    columns: [
      { name: 'date', type, nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'value', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('horizon_chart', () => {
  const renderer = () => chartRegistry.get('horizon_chart')!.createRenderer() as EChartsBaseRenderer;

  it('registers date and value roles', () => {
    const def = chartRegistry.get('horizon_chart')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'value']);
  });

  it('renders three folded magnitude bands on a time axis', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    const series = opt.series as Array<{ name: string; data: unknown[]; areaStyle: { opacity: number; color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['Band 1', 'Band 2', 'Band 3']);
    expect(series[0].data).toEqual([['2024-01-01', 1], ['2024-01-03', 1]]);
    expect(series[2].areaStyle.opacity).toBeCloseTo(0.42);
    expect(series[1].areaStyle.color).toBe('#0f0');
  });

  it('uses category axis data for non-temporal dates', () => {
    const opt = renderer().buildOption(view('category'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01', '2024-01-03']);
  });

  it('renders empty arrays and an empty state when no finite values exist', () => {
    const empty: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(empty, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    const el = chartRegistry.get('horizon_chart')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No horizon values to chart');
  });
});
