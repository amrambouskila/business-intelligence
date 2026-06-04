import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/partial_autocorrelation_plot';
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

const cfg: ChartConfig = { chartType: 'partial_autocorrelation_plot', columns: { value: 'value' }, options: {} };

function view(values: unknown[] = [1, 2, 3, 4]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { value: values },
    columns: [{ name: 'value', type: 'float', nullable: false, uniqueCount: 4, nullCount: 0 }],
    rowCount: values.length,
  };
}

describe('partial_autocorrelation_plot', () => {
  const renderer = () => chartRegistry.get('partial_autocorrelation_plot')!.createRenderer() as EChartsBaseRenderer;

  it('registers a single value role', () => {
    const def = chartRegistry.get('partial_autocorrelation_plot')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['value']);
  });

  it('renders PACF bars with a zero reference line', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['1', '2', '3']);
    const series = opt.series as Array<{ data: number[]; markLine: { data: Array<{ yAxis: number; name: string }> }; itemStyle: { color: string } }>;
    expect(series[0].data).toEqual([0.25, -0.386667, -0.312709]);
    expect(series[0].markLine.data).toEqual([{ yAxis: 0, name: 'Zero' }]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('renders an empty state for constant or missing values', () => {
    const opt = renderer().buildOption(view([4, 4, 4]), cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    const el = chartRegistry.get('partial_autocorrelation_plot')!.createRenderer().render(view([4, 4, 4]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No partial autocorrelation values to chart');
  });

  it('falls back to empty bars when the referenced value column is missing', () => {
    const opt = renderer().buildOption(view([1, 2, 3]), { ...cfg, columns: { value: 'missing' } }, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
