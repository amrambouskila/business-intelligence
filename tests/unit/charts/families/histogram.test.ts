import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/histogram';
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

function view(values: number[]): DataView {
  return {
    sourceId: 'v', rows: values.map((v) => ({ v })),
    columnArrays: { v: values },
    columns: [{ name: 'v', type: 'float', nullable: false, uniqueCount: values.length, nullCount: 0 }],
    rowCount: values.length, filters: [],
  };
}

function cfg(bins?: number): ChartConfig {
  return { chartType: 'histogram', columns: { value: 'v' }, options: bins != null ? { bins } : {} };
}

describe('histogram registration', () => {
  it('registers under type "histogram" with the distribution family', () => {
    const def = chartRegistry.get('histogram');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns[0].role).toBe('value');
  });
});

describe('histogram buildOption', () => {
  it('produces bin counts summing to the input length', () => {
    const def = chartRegistry.get('histogram')!;
    const renderer = def.createRenderer() as EChartsBaseRenderer;
    const values = [1, 2, 2, 3, 3, 3, 4, 4, 5];
    const opt = renderer.buildOption(view(values), cfg(5), theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: number[] }>;
    const total = series[0].data.reduce((a, b) => a + b, 0);
    expect(total).toBe(values.length);
  });

  it('defaults to 30 bins when bins option is omitted', () => {
    const def = chartRegistry.get('histogram')!;
    const renderer = def.createRenderer() as EChartsBaseRenderer;
    const opt = renderer.buildOption(view([1, 2, 3, 4, 5]), cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data.length).toBe(30);
  });

  it('handles a strictly descending sequence (covers max/min reduce branches)', () => {
    const def = chartRegistry.get('histogram')!;
    const renderer = def.createRenderer() as EChartsBaseRenderer;
    const opt = renderer.buildOption(view([9, 7, 5, 3, 1]), cfg(5), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('handles a single-value dataset without crashing', () => {
    const def = chartRegistry.get('histogram')!;
    const renderer = def.createRenderer() as EChartsBaseRenderer;
    const opt = renderer.buildOption(view([5]), cfg(10), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('falls back to empty values when the referenced column is missing', () => {
    const def = chartRegistry.get('histogram')!;
    const renderer = def.createRenderer() as EChartsBaseRenderer;
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const opt = renderer.buildOption(dv, { chartType: 'histogram', columns: { value: 'missing' }, options: { bins: 4 } }, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data.every((n) => n === 0)).toBe(true);
  });

  it('filters non-numeric values out of the histogram', () => {
    const def = chartRegistry.get('histogram')!;
    const renderer = def.createRenderer() as EChartsBaseRenderer;
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { v: [1, 2, 'oops', 3] },
      columns: [{ name: 'v', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 }],
      rowCount: 4,
    };
    const opt = renderer.buildOption(dv, cfg(3), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('places each value into the correct bin', () => {
    const def = chartRegistry.get('histogram')!;
    const renderer = def.createRenderer() as EChartsBaseRenderer;
    const opt = renderer.buildOption(view([1, 2, 2, 3, 3, 3, 4, 4, 5]), cfg(5), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([1, 2, 3, 2, 1]);
  });

  it('omits the y-axis axisLine (matches pre-refactor styling)', () => {
    const def = chartRegistry.get('histogram')!;
    const opt = (def.createRenderer() as EChartsBaseRenderer).buildOption(view([1, 2, 3]), cfg(), theme()) as EChartsOption;
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
  });
});

describe('histogram empty-data guard', () => {
  const renderer = () => chartRegistry.get('histogram')!.createRenderer() as EChartsBaseRenderer;

  it('renders a themed empty state when the column has no numeric values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { v: ['a', 'b'] },
      columns: [{ name: 'v', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 }],
      rowCount: 2,
    };
    const el = renderer().render(dv, cfg(), theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('renders the chart (not the empty state) when numeric values are present', () => {
    const el = renderer().render(view([1, 2, 3]), cfg(), theme());
    expect(el.type).not.toBe(EmptyChartState);
  });

  it('treats an all-non-finite (NaN) column as empty', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { v: [NaN, NaN] },
      columns: [{ name: 'v', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 }],
      rowCount: 2,
    };
    const el = renderer().render(dv, cfg(), theme());
    expect(el.type).toBe(EmptyChartState);
  });

  it('excludes non-finite values (Infinity) so bin edges stay finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { v: [1, 2, 3, Infinity] },
      columns: [{ name: 'v', type: 'float', nullable: false, uniqueCount: 4, nullCount: 0 }],
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg(3), theme()) as EChartsOption;
    const labels = (opt.xAxis as { data: string[] }).data;
    expect(labels.every((l) => !l.includes('Infinity') && !l.includes('NaN'))).toBe(true);
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data.reduce((a, b) => a + b, 0)).toBe(3);
  });
});
