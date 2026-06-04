import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/autocorrelation_plot';
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

const cfg: ChartConfig = { chartType: 'autocorrelation_plot', columns: { value: 'value' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { value: [1, 2, 3, 4] },
    columns: [{ name: 'value', type: 'float', nullable: false, uniqueCount: 4, nullCount: 0 }],
    rowCount: 4,
  };
}

describe('autocorrelation_plot', () => {
  const renderer = () => chartRegistry.get('autocorrelation_plot')!.createRenderer() as EChartsBaseRenderer;

  it('registers a single value role', () => {
    const def = chartRegistry.get('autocorrelation_plot')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['value']);
  });

  it('renders autocorrelation bars with a zero mark line', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['1', '2', '3']);
    expect((opt.yAxis as { min: number; max: number }).min).toBe(-1);
    const series = opt.series as Array<{ data: number[]; markLine: { data: Array<{ yAxis: number; name: string }> }; itemStyle: { color: string } }>;
    expect(series[0].data).toEqual([0.25, -0.3, -0.45]);
    expect(series[0].markLine.data).toEqual([{ yAxis: 0, name: 'Zero' }]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('renders an empty state for constant or missing values', () => {
    const empty = view();
    empty.columnArrays.value = [4, 4, 4];
    const opt = renderer().buildOption(empty, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    const el = chartRegistry.get('autocorrelation_plot')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No autocorrelation values to chart');
  });

  it('falls back to empty bars when the referenced value column is missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
