import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/histogram';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
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
});
