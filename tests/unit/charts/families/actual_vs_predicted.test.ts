import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/actual_vs_predicted';
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
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(actual: unknown[], predicted: unknown[]): DataView {
  const n = Math.max(actual.length, predicted.length);
  return {
    sourceId: 'v', rows: [], filters: [],
    columnArrays: { actual, predicted },
    columns: [
      { name: 'actual', type: 'float', nullable: false, uniqueCount: actual.length, nullCount: 0 },
      { name: 'predicted', type: 'float', nullable: false, uniqueCount: predicted.length, nullCount: 0 },
    ],
    rowCount: n,
  };
}

const cfg: ChartConfig = { chartType: 'actual_vs_predicted', columns: { actual: 'actual', predicted: 'predicted' }, options: {} };

const renderer = () => chartRegistry.get('actual_vs_predicted')!.createRenderer() as EChartsBaseRenderer;

describe('actual_vs_predicted registration', () => {
  it('registers under type "actual_vs_predicted" in the statistical family', () => {
    const def = chartRegistry.get('actual_vs_predicted');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.name).toBe('Actual vs Predicted');
    expect(def!.compatibleShapes).toEqual(['two_numeric', 'generic']);
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['actual', 'predicted']);
  });
});

describe('actual_vs_predicted buildOption', () => {
  it('plots a scatter series of [actual, predicted] pairs', () => {
    const opt = renderer().buildOption(view([1, 2, 3], [2, 1, 5]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: unknown[]; itemStyle?: { color: string } }>;
    expect(series[0].type).toBe('scatter');
    expect(series[0].data).toEqual([[1, 2], [2, 1], [3, 5]]);
    expect(series[0].itemStyle!.color).toBe('#f00');
  });

  it('adds a y=x reference line from [min,min] to [max,max] across all finite values', () => {
    const opt = renderer().buildOption(view([1, 2, 3], [2, 1, 5]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: unknown[]; showSymbol?: boolean; lineStyle?: { color: string } }>;
    expect(series[1].type).toBe('line');
    expect(series[1].data).toEqual([[1, 1], [5, 5]]);
    expect(series[1].showSymbol).toBe(false);
    expect(series[1].lineStyle!.color).toBe('#333');
  });

  it('builds value x/y axes naming the actual and predicted columns and omits the y-axis axisLine', () => {
    const opt = renderer().buildOption(view([1, 2], [1, 2]), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.xAxis as { name: string }).name).toBe('actual');
    expect((opt.yAxis as { name: string }).name).toBe('predicted');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
  });

  it('drops pairs where either actual or predicted is non-finite', () => {
    const opt = renderer().buildOption(view([1, NaN, 3, 4], [2, 5, Infinity, 8]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([[1, 2], [4, 8]]);
    expect(series[1].data).toEqual([[1, 1], [8, 8]]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const missingCfg: ChartConfig = { chartType: 'actual_vs_predicted', columns: { actual: 'missing_a', predicted: 'missing_p' }, options: {} };
    expect(renderer().render(dv, missingCfg, theme()).type).toBe(EmptyChartState);
  });
});

describe('actual_vs_predicted empty-data guard', () => {
  it('renders a themed empty state when no finite pairs exist', () => {
    const el = renderer().render(view([NaN, 'x'], [Infinity, 'y']), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No predictions to chart');
  });

  it('renders the chart (not the empty state) when at least one finite pair exists', () => {
    const el = renderer().render(view([1, 2], [3, 4]), cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });
});
