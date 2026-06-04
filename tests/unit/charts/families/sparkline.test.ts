import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/sparkline';
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

const cfg: ChartConfig = { chartType: 'sparkline', columns: { date: 'date', value: 'value' }, options: {} };

function view(type: 'datetime' | 'category' = 'datetime'): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['2024-01-01', '2024-01-02', '2024-01-03'], value: [1, NaN, 3] },
    columns: [
      { name: 'date', type, nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'value', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('sparkline', () => {
  const renderer = () => chartRegistry.get('sparkline')!.createRenderer() as EChartsBaseRenderer;

  it('registers with date and value roles', () => {
    const def = chartRegistry.get('sparkline')!;
    expect(def.family).toBe('time-series');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'value']);
  });

  it('renders finite paired points on a hidden time axis', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; show: boolean }).type).toBe('time');
    expect((opt.xAxis as { show: boolean }).show).toBe(false);
    expect((opt.yAxis as { show: boolean; scale: boolean }).scale).toBe(true);
    expect((opt.tooltip as { show: boolean }).show).toBe(false);
    const series = opt.series as Array<{ data: unknown[]; smooth: boolean; areaStyle: { opacity: number; color: string } }>;
    expect(series[0].data).toEqual([['2024-01-01', 1], ['2024-01-03', 3]]);
    expect(series[0].smooth).toBe(true);
    expect(series[0].areaStyle.color).toBe('#f00');
  });

  it('uses a hidden category axis for non-temporal dates', () => {
    const opt = renderer().buildOption(view('category'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('category');
  });

  it('falls back to an empty point set for missing columns and renders an empty state with no finite values', () => {
    const empty: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(empty, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    const el = chartRegistry.get('sparkline')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No time-series values to chart');
  });
});
