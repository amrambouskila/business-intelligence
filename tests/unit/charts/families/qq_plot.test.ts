import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/qq_plot';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { EmptyChartState } from '@/charts/renderers/EmptyChartState';
import { qqPoints } from '@/data/stats/qqPoints';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
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

const cfg: ChartConfig = { chartType: 'qq_plot', columns: { value: 'v' }, options: {} };
const renderer = () => chartRegistry.get('qq_plot')!.createRenderer() as EChartsBaseRenderer;

describe('qq_plot registration', () => {
  it('registers under type "qq_plot" with the distribution family', () => {
    const def = chartRegistry.get('qq_plot');
    expect(def).toBeDefined();
    expect(def!.type).toBe('qq_plot');
    expect(def!.family).toBe('distribution');
    expect(def!.renderer).toBe('echarts');
    expect(def!.name).toBe('Q-Q Plot');
    expect(def!.requiredColumns[0].role).toBe('value');
    expect(def!.compatibleShapes).toEqual(['single_numeric', 'category_numeric', 'generic']);
  });
});

describe('qq_plot buildOption', () => {
  it('plots [theoretical, sample] with sample = sorted input values', () => {
    const opt = renderer().buildOption(view([0, 1, 2, 3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: number[][] }>;
    expect(series[0].type).toBe('scatter');

    // Sample column (y) equals the sorted input.
    const sampleColumn = series[0].data.map((pt) => pt[1]);
    expect(sampleColumn).toEqual([0, 1, 2, 3]);

    // Theoretical column (x) equals the qqPoints theoretical quantiles.
    const theoreticalColumn = series[0].data.map((pt) => pt[0]);
    const expectedTheoretical = qqPoints([0, 1, 2, 3]).map((p) => p.theoretical);
    expect(theoreticalColumn).toEqual(expectedTheoretical);
  });

  it('sorts unsorted input before pairing with theoretical quantiles', () => {
    const opt = renderer().buildOption(view([3, 0, 2, 1]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data.map((pt) => pt[1])).toEqual([0, 1, 2, 3]);
  });

  it('fits the reference line sample = mean + sd*theoretical over the theoretical range', () => {
    const opt = renderer().buildOption(view([0, 1, 2, 3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: number[][] }>;
    expect(series[1].type).toBe('line');
    expect(series[1].data).toHaveLength(2);

    const pts = qqPoints([0, 1, 2, 3]);
    const theoreticals = pts.map((p) => p.theoretical);
    const tMin = Math.min(...theoreticals);
    const tMax = Math.max(...theoreticals);
    // mean = 1.5, population variance = 1.25, sd = sqrt(1.25).
    const mean = 1.5;
    const sd = Math.sqrt(1.25);

    expect(series[1].data[0][0]).toBeCloseTo(tMin, 12);
    expect(series[1].data[0][1]).toBeCloseTo(mean + sd * tMin, 12);
    expect(series[1].data[1][0]).toBeCloseTo(tMax, 12);
    expect(series[1].data[1][1]).toBeCloseTo(mean + sd * tMax, 12);
  });

  it('colors points from palette index 0 and the reference line from index 1', () => {
    const opt = renderer().buildOption(view([0, 1, 2, 3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ itemStyle: { color: string }; lineStyle?: { color: string } }>;
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[1].lineStyle!.color).toBe('#0f0');
    expect(series[1].itemStyle.color).toBe('#0f0');
  });

  it('names the axes Theoretical / Sample and omits the y-axis axisLine', () => {
    const opt = renderer().buildOption(view([0, 1, 2, 3]), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; name: string }).type).toBe('value');
    expect((opt.xAxis as { name: string }).name).toBe('Theoretical');
    expect((opt.yAxis as { name: string }).name).toBe('Sample');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
  });

  it('drops non-finite values before computing quantiles', () => {
    const opt = renderer().buildOption(view([2, NaN, 0, Infinity, 1]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data.map((pt) => pt[1])).toEqual([0, 1, 2]);
  });

  it('falls back to empty values when the referenced column is missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const missingCfg: ChartConfig = { chartType: 'qq_plot', columns: { value: 'missing' }, options: {} };
    const el = renderer().render(dv, missingCfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });
});

describe('qq_plot empty-data guard', () => {
  it('renders a themed empty state when the column has no finite values', () => {
    const el = renderer().render(view(['a', 'b']), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No numeric values to chart');
  });

  it('treats an all-NaN column as empty', () => {
    const el = renderer().render(view([NaN, NaN]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });

  it('renders the chart (not the empty state) when finite values are present', () => {
    const el = renderer().render(view([0, 1, 2, 3]), cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });
});
