import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/lag_plot';
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

const cfg: ChartConfig = { chartType: 'lag_plot', columns: { value: 'value' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { value: [1, NaN, 3, 6] },
    columns: [{ name: 'value', type: 'float', nullable: true, uniqueCount: 4, nullCount: 0 }],
    rowCount: 4,
  };
}

describe('lag_plot', () => {
  const renderer = () => chartRegistry.get('lag_plot')!.createRenderer() as EChartsBaseRenderer;

  it('registers a single value role', () => {
    const def = chartRegistry.get('lag_plot')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['value']);
  });

  it('renders lag-one pairs from finite ordered values', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; name: string }).name).toBe('Lag 1');
    const series = opt.series as Array<{ data: Array<[number, number]>; itemStyle: { color: string; opacity: number } }>;
    expect(series[0].data).toEqual([[1, 3], [3, 6]]);
    expect(series[0].itemStyle).toEqual({ color: '#f00', opacity: 0.72 });
  });

  it('renders an empty state when fewer than two finite values exist', () => {
    const empty = view();
    empty.columnArrays.value = [NaN, 2];
    const opt = renderer().buildOption(empty, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    const el = chartRegistry.get('lag_plot')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No lag pairs to chart');
  });

  it('falls back to empty pairs when the referenced value column is missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
