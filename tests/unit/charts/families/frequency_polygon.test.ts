import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/frequency_polygon';
import { chartRegistry } from '@/charts/registry';
import { histogramBins } from '@/charts/echarts/histogramBins';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { EmptyChartState } from '@/charts/renderers/EmptyChartState';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(value: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { value },
    columns: [{ name: 'value', type: 'float', nullable: false, uniqueCount: value.length, nullCount: 0 }],
    rowCount: value.length,
  };
}

function cfg(bins?: number): ChartConfig {
  return { chartType: 'frequency_polygon', columns: { value: 'value' }, options: bins != null ? { bins } : {} };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('frequency_polygon')!.createRenderer() as EChartsBaseRenderer;
}

describe('frequency_polygon registration', () => {
  it('registers under type "frequency_polygon" in the distribution family', () => {
    const def = chartRegistry.get('frequency_polygon');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.name).toBe('Frequency Polygon');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns).toEqual([
      { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
    ]);
    expect(def!.compatibleShapes).toEqual(['single_numeric', 'category_numeric', 'generic']);
  });

  it('declares a bins number option (default 10, range 2..100)', () => {
    const def = chartRegistry.get('frequency_polygon')!;
    const bins = def.options!.find((o) => o.key === 'bins')!;
    expect(bins.control).toBe('number');
    expect(bins.default).toBe(10);
    expect(bins.min).toBe(2);
    expect(bins.max).toBe(100);
    expect(bins.step).toBe(1);
  });
});

describe('frequency_polygon buildOption', () => {
  it('maps bin centers to x and bin counts to y for [0..9] with 5 bins', () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const opt = renderer().buildOption(view(values), cfg(5), theme()) as EChartsOption;
    const series = opt.series as Array<{
      type: string; smooth: boolean; showSymbol: boolean; data: Array<[number, number]>;
    }>;
    expect(series[0].type).toBe('line');
    expect(series[0].smooth).toBe(false);
    expect(series[0].showSymbol).toBe(true);

    // Reference-validate against the shared binning: width = (9-0)/5 = 1.8.
    const { binCenters, counts } = histogramBins(values, 5);
    expect(counts).toEqual([2, 2, 2, 2, 2]);
    expect(series[0].data.map((p) => p[1])).toEqual([2, 2, 2, 2, 2]);
    const xs = series[0].data.map((p) => p[0]);
    expect(xs).toHaveLength(5);
    xs.forEach((x, i) => expect(x).toBeCloseTo(binCenters[i], 10));
    expect(xs[0]).toBeCloseTo(0.9, 10);
    expect(xs[4]).toBeCloseTo(8.1, 10);
  });

  it('defaults to 10 bins when the bins option is omitted', () => {
    const opt = renderer().buildOption(view([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), cfg(), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number]> }>;
    expect(series[0].data).toHaveLength(10);
  });

  it('uses value/value axes with the y-axis axisLine suppressed and palette color', () => {
    const opt = renderer().buildOption(view([1, 2, 3, 4]), cfg(4), theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
    const series = opt.series as Array<{
      areaStyle: object; lineStyle: { color: string }; itemStyle: { color: string };
    }>;
    expect(series[0].areaStyle).toEqual({});
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('drops non-finite values before binning', () => {
    const opt = renderer().buildOption(view([1, NaN, 2, Infinity, 3]), cfg(3), theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number]> }>;
    const expected = histogramBins([1, 2, 3], 3);
    expect(series[0].data.map((p) => p[1]).reduce((a, b) => a + b, 0)).toBe(3);
    series[0].data.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(expected.binCenters[i], 10);
      expect(p[1]).toBe(expected.counts[i]);
    });
  });
});

describe('frequency_polygon empty guard', () => {
  it('renders the empty state when there are no finite values', () => {
    const el = renderer().render(view([NaN, Infinity, -Infinity]), cfg(), theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No numeric values to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = renderer().render(dv, cfg(4), theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No numeric values to chart');
  });

  it('renders a chart element (not the empty state) when finite values are present', () => {
    const el = renderer().render(view([1, 2, 3, 4]), cfg(), theme());
    expect(el.type).not.toBe(EmptyChartState);
    expect((el.props as { option?: unknown }).option).toBeDefined();
  });
});
