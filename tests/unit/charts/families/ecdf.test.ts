import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/ecdf';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { EmptyChartState } from '@/charts/renderers/EmptyChartState';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(values: unknown[]): DataView {
  return {
    sourceId: 'v', rows: [],
    columnArrays: { v: values },
    columns: [{ name: 'v', type: 'float', nullable: false, uniqueCount: values.length, nullCount: 0 }],
    rowCount: values.length, filters: [],
  };
}

const cfg: ChartConfig = { chartType: 'ecdf', columns: { value: 'v' }, options: {} };

describe('ecdf registration', () => {
  it('registers under type "ecdf" with the distribution family', () => {
    const def = chartRegistry.get('ecdf');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.renderer).toBe('echarts');
    expect(def!.name).toBe('ECDF');
    expect(def!.requiredColumns[0].role).toBe('value');
    expect(def!.compatibleShapes).toEqual(['single_numeric', 'category_numeric', 'generic']);
  });
});

describe('ecdf buildOption', () => {
  const renderer = () => chartRegistry.get('ecdf')!.createRenderer() as EChartsBaseRenderer;

  it('sorts ascending and emits [value, (i+1)/n] step points', () => {
    const opt = renderer().buildOption(view([3, 1, 2]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; step: string; data: number[][]; showSymbol: boolean }>;
    expect(series[0].type).toBe('line');
    expect(series[0].step).toBe('end');
    expect(series[0].showSymbol).toBe(false);
    expect(series[0].data).toEqual([[1, 1 / 3], [2, 2 / 3], [3, 1]]);
  });

  it('colors the line and points from the categorical palette index 0', () => {
    const opt = renderer().buildOption(view([1, 2, 3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ lineStyle: { color: string }; itemStyle: { color: string } }>;
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('builds value x/y axes and omits the y-axis axisLine', () => {
    const opt = renderer().buildOption(view([1, 2, 3]), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
    expect((opt.yAxis as { name: string }).name).toBe('Cumulative proportion');
  });

  it('drops non-finite values before computing the ECDF', () => {
    const opt = renderer().buildOption(view([2, NaN, 1, Infinity]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([[1, 1 / 2], [2, 1]]);
  });

  it('falls back to empty values when the referenced column is missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(dv, { chartType: 'ecdf', columns: { value: 'missing' }, options: {} }, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([]);
  });
});

describe('ecdf empty-data guard', () => {
  const renderer = () => chartRegistry.get('ecdf')!.createRenderer() as EChartsBaseRenderer;

  it('renders a themed empty state when the column has no finite values', () => {
    const el = renderer().render(view(['a', 'b']), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('treats an all-NaN column as empty', () => {
    const el = renderer().render(view([NaN, NaN]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });

  it('renders the chart (not the empty state) when finite values are present', () => {
    const el = renderer().render(view([1, 2, 3]), cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });
});
