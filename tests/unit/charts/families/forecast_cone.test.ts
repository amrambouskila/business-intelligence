import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/forecast_cone';
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

const cfg: ChartConfig = { chartType: 'forecast_cone', columns: { date: 'date', center: 'center', lower: 'lower', upper: 'upper' }, options: {} };

function view(type: 'datetime' | 'category' = 'datetime'): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['2024-01-01', '2024-01-08', '2024-01-15'],
      center: [10, 12, 14],
      lower: [8, NaN, 11],
      upper: [12, 16, 18],
    },
    columns: [
      { name: 'date', type, nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'center', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'lower', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
      { name: 'upper', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('forecast_cone', () => {
  const renderer = () => chartRegistry.get('forecast_cone')!.createRenderer() as EChartsBaseRenderer;

  it('registers forecast cone roles', () => {
    const def = chartRegistry.get('forecast_cone')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'center', 'lower', 'upper']);
  });

  it('renders lower, center, and upper lines while dropping incomplete rows', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    expect((opt.legend as { data: string[] }).data).toEqual(['Lower', 'Center', 'Upper']);
    const series = opt.series as Array<{ name: string; data: unknown[]; lineStyle: { color: string; type?: string }; areaStyle?: { color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['Lower', 'Center', 'Upper']);
    expect(series[0].data).toEqual([['2024-01-01', 8], ['2024-01-15', 11]]);
    expect(series[1].data).toEqual([['2024-01-01', 10], ['2024-01-15', 14]]);
    expect(series[0].lineStyle.type).toBe('dashed');
    expect(series[1].lineStyle.color).toBe('#f00');
    expect(series[2].areaStyle?.color).toBe('#0f0');
  });

  it('uses category-axis arrays when date is not temporal', () => {
    const opt = renderer().buildOption(view('category'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01', '2024-01-15']);
    expect((opt.series as Array<{ data: number[] }>)[1].data).toEqual([10, 14]);
  });

  it('renders an empty state when no complete forecast row exists', () => {
    const empty: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(empty, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    const el = chartRegistry.get('forecast_cone')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No forecast cone values to chart');
  });
});
