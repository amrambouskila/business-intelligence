import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/gauge';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function emptyPaletteTheme(): ThemeTokens {
  return { ...theme(), colorScale: [] };
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
  return chartRegistry.get('gauge')!.createRenderer() as EChartsBaseRenderer;
}

function config(options: Record<string, unknown> = {}): ChartConfig {
  return { chartType: 'gauge', columns: { value: 'value' }, options };
}

interface GaugeSeries {
  type: string;
  min: number;
  max: number;
  progress: { itemStyle: { color: string } };
  axisLine: { lineStyle: { color: Array<[number, string]> } };
  pointer: { itemStyle: { color: string } };
  detail: { color: string; formatter: (displayValue: number) => string };
  data: Array<{ value: number }>;
}

function gaugeSeries(opt: EChartsOption): GaugeSeries {
  return (opt.series as GaugeSeries[])[0];
}

describe('gauge registration', () => {
  it('registers under type "gauge" with the specialized family', () => {
    const def = chartRegistry.get('gauge');
    expect(def).toBeDefined();
    expect(def!.type).toBe('gauge');
    expect(def!.family).toBe('specialized');
    expect(def!.name).toBe('Gauge');
    expect(def!.renderer).toBe('echarts');
  });

  it('requires a numeric value column over single_numeric/generic shapes', () => {
    const def = chartRegistry.get('gauge')!;
    expect(def.requiredColumns).toEqual([
      { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
    ]);
    expect(def.compatibleShapes).toEqual(['single_numeric', 'generic']);
  });

  it('declares an aggregate select option defaulting to mean', () => {
    const def = chartRegistry.get('gauge')!;
    const agg = def.options!.find((o) => o.key === 'aggregate')!;
    expect(agg.control).toBe('select');
    expect(agg.default).toBe('mean');
    expect(agg.choices).toEqual([
      { value: 'mean', label: 'Mean' },
      { value: 'max', label: 'Max' },
      { value: 'min', label: 'Min' },
      { value: 'sum', label: 'Sum' },
    ]);
  });
});

describe('gauge buildOption', () => {
  it('emits a gauge series with the mean by default and max = largest finite value', () => {
    const opt = renderer().buildOption(dataView([10, 20, 30]), config(), theme()) as EChartsOption;
    const series = gaugeSeries(opt);
    expect(series.type).toBe('gauge');
    expect(series.min).toBe(0);
    expect(series.max).toBe(30);
    expect(series.data[0].value).toBe(20);
  });

  it('aggregates with max when selected', () => {
    const opt = renderer().buildOption(dataView([10, 20, 30]), config({ aggregate: 'max' }), theme()) as EChartsOption;
    expect(gaugeSeries(opt).data[0].value).toBe(30);
  });

  it('aggregates with min when selected', () => {
    const opt = renderer().buildOption(dataView([10, 20, 30]), config({ aggregate: 'min' }), theme()) as EChartsOption;
    expect(gaugeSeries(opt).data[0].value).toBe(10);
  });

  it('aggregates with sum when selected', () => {
    const opt = renderer().buildOption(dataView([10, 20, 30]), config({ aggregate: 'sum' }), theme()) as EChartsOption;
    expect(gaugeSeries(opt).data[0].value).toBe(60);
  });

  it('falls back to a max of 100 when every finite value is <= 0', () => {
    const opt = renderer().buildOption(dataView([-5, -10, 0]), config({ aggregate: 'min' }), theme()) as EChartsOption;
    const series = gaugeSeries(opt);
    expect(series.max).toBe(100);
    expect(series.data[0].value).toBe(-10);
  });

  it('themes the accent from the palette and the detail from the foreground', () => {
    const opt = renderer().buildOption(dataView([10, 20, 30]), config(), theme()) as EChartsOption;
    const series = gaugeSeries(opt);
    expect(series.progress.itemStyle.color).toBe('#f00');
    expect(series.pointer.itemStyle.color).toBe('#f00');
    expect(series.axisLine.lineStyle.color).toEqual([[1, '#f00']]);
    expect(series.detail.color).toBe('#fff');
    expect(series.detail.formatter(59.251299999999965)).toBe('59.25');
  });

  it('uses the foreground accent when the palette is empty', () => {
    const opt = renderer().buildOption(dataView([10, 20, 30]), config(), emptyPaletteTheme()) as EChartsOption;
    expect(gaugeSeries(opt).progress.itemStyle.color).toBe('#fff');
  });

  it('drops non-finite values before aggregating', () => {
    const opt = renderer().buildOption(dataView([10, NaN, 20, Infinity, 30, -Infinity]), config({ aggregate: 'sum' }), theme()) as EChartsOption;
    const series = gaugeSeries(opt);
    expect(series.data[0].value).toBe(60);
    expect(series.max).toBe(30);
  });

  it('rounds the displayed value to 2 decimals (no 15-digit float artifact)', () => {
    // mean of [1,2,2] = 1.6666… → rounded so the gauge detail reads cleanly.
    const opt = renderer().buildOption(dataView([1, 2, 2]), config(), theme()) as EChartsOption;
    expect(gaugeSeries(opt).data[0].value).toBe(1.67);
  });
});

describe('gauge empty guard', () => {
  it('renders the empty state when there are no finite values', () => {
    const el = renderer().render(dataView([NaN, Infinity, -Infinity]), config(), theme());
    expect((el.props as { message?: string }).message).toBe('No numeric value to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const cfg: ChartConfig = { chartType: 'gauge', columns: { value: 'missing' }, options: {} };
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = renderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No numeric value to chart');
  });

  it('renders a chart element when finite values are present', () => {
    const el = renderer().render(dataView([10, 20, 30]), config(), theme());
    expect((el.props as { message?: string }).message).toBeUndefined();
    expect((el.props as { option?: unknown }).option).toBeDefined();
  });
});
