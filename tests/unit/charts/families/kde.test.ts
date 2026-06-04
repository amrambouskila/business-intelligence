import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/kde';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { kernelDensity } from '@/data/stats/kernelDensity';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function dataView(value: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { value },
    columns: [{ name: 'value', type: 'numeric', nullable: false, uniqueCount: value.length, nullCount: 0 }],
    rowCount: value.length,
  };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('kde')!.createRenderer() as EChartsBaseRenderer;
}

describe('kde registration', () => {
  it('registers under type "kde" with the distribution family', () => {
    const def = chartRegistry.get('kde');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.name).toBe('Density (KDE)');
    expect(def!.renderer).toBe('echarts');
  });

  it('requires a numeric value column and a bandwidth option defaulting to auto', () => {
    const def = chartRegistry.get('kde')!;
    expect(def.requiredColumns).toEqual([
      { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
    ]);
    expect(def.compatibleShapes).toEqual(['single_numeric', 'category_numeric', 'generic']);
    const bw = def.options!.find((o) => o.key === 'bandwidth')!;
    expect(bw.control).toBe('number');
    expect(bw.default).toBe(0);
    expect(bw.min).toBe(0);
    expect(bw.max).toBe(10);
    expect(bw.step).toBe(0.1);
  });
});

describe('kde buildOption', () => {
  const sample = [1, 2, 2, 3, 5, 8, 13];

  it('builds value/value axes with the y-axis axisLine suppressed', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'value' }, options: {} };
    const opt = renderer().buildOption(dataView(sample), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
  });

  it('emits a smooth area line series of [x, y] pairs matching the curve length', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'value' }, options: {} };
    const opt = renderer().buildOption(dataView(sample), cfg, theme()) as EChartsOption;
    const curve = kernelDensity(sample, { bandwidth: undefined });
    const series = opt.series as Array<{
      type: string; smooth: boolean; showSymbol: boolean;
      areaStyle: object; data: Array<[number, number]>;
      lineStyle: { color: string }; itemStyle: { color: string };
    }>;
    expect(series[0].type).toBe('line');
    expect(series[0].smooth).toBe(true);
    expect(series[0].showSymbol).toBe(false);
    expect(series[0].areaStyle).toEqual({});
    expect(series[0].data).toHaveLength(curve.length);
    expect(series[0].data[0]).toEqual([curve[0].x, curve[0].y]);
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('uses Silverman auto bandwidth when the option is 0', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'value' }, options: { bandwidth: 0 } };
    const opt = renderer().buildOption(dataView(sample), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number]> }>;
    const auto = kernelDensity(sample, { bandwidth: undefined });
    expect(series[0].data).toEqual(auto.map((p) => [p.x, p.y]));
  });

  it('passes an explicit bandwidth through to kernelDensity when > 0', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'value' }, options: { bandwidth: 2.5 } };
    const opt = renderer().buildOption(dataView(sample), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number]> }>;
    const explicit = kernelDensity(sample, { bandwidth: 2.5 });
    expect(series[0].data).toEqual(explicit.map((p) => [p.x, p.y]));
    // The explicit narrow bandwidth produces a different curve than the auto path.
    const auto = kernelDensity(sample, { bandwidth: undefined });
    expect(series[0].data).not.toEqual(auto.map((p) => [p.x, p.y]));
  });

  it('drops non-finite values before estimating density', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'value' }, options: { bandwidth: 1 } };
    const opt = renderer().buildOption(dataView([1, NaN, 2, Infinity, 3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number]> }>;
    const expected = kernelDensity([1, 2, 3], { bandwidth: 1 });
    expect(series[0].data).toEqual(expected.map((p) => [p.x, p.y]));
  });
});

describe('kde empty guard', () => {
  it('renders the empty state when there are no finite values', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'value' }, options: {} };
    const el = renderer().render(dataView([NaN, Infinity, -Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No numeric values to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'missing' }, options: {} };
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = renderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No numeric values to chart');
  });

  it('renders a chart element when finite values are present', () => {
    const cfg: ChartConfig = { chartType: 'kde', columns: { value: 'value' }, options: {} };
    const el = renderer().render(dataView([1, 2, 3, 4]), cfg, theme());
    expect((el.props as { message?: string }).message).toBeUndefined();
    expect((el.props as { option?: unknown }).option).toBeDefined();
  });
});
