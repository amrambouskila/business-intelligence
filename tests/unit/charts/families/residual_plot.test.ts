import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/residual_plot';
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

function view(predicted: unknown[], residual: unknown[]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { predicted, residual },
    columns: [
      { name: 'predicted', type: 'float', nullable: false, uniqueCount: predicted.length, nullCount: 0 },
      { name: 'residual', type: 'float', nullable: false, uniqueCount: residual.length, nullCount: 0 },
    ],
    rowCount: predicted.length,
  };
}

const cfg: ChartConfig = { chartType: 'residual_plot', columns: { predicted: 'predicted', residual: 'residual' }, options: {} };

const renderer = () => chartRegistry.get('residual_plot')!.createRenderer() as EChartsBaseRenderer;

describe('residual_plot registration', () => {
  it('registers under type "residual_plot" with the statistical family', () => {
    const def = chartRegistry.get('residual_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
    expect(def!.name).toBe('Residual Plot');
    expect(def!.compatibleShapes).toEqual(['two_numeric', 'generic']);
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['predicted', 'residual']);
  });
});

describe('residual_plot buildOption', () => {
  it('builds a scatter series of [predicted, residual] points', () => {
    const opt = renderer().buildOption(view([1, 2, 3], [0.5, -0.5, 0.1]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: Array<[number, number]>; itemStyle: { color: string } }>;
    expect(series[0].type).toBe('scatter');
    expect(series[0].data).toEqual([[1, 0.5], [2, -0.5], [3, 0.1]]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('draws a zero reference markLine styled with the grid color', () => {
    const opt = renderer().buildOption(view([1, 2], [0.2, -0.3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ markLine: { data: Array<{ yAxis: number }>; lineStyle: { color: string } } }>;
    expect(series[0].markLine.data).toEqual([{ yAxis: 0 }]);
    expect(series[0].markLine.lineStyle.color).toBe('#333');
  });

  it('builds value x/y axes and omits the y-axis axisLine', () => {
    const opt = renderer().buildOption(view([1, 2], [0.2, -0.3]), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
    expect((opt.xAxis as { name: string }).name).toBe('predicted');
    expect((opt.yAxis as { name: string }).name).toBe('residual');
  });

  it('drops pairs where either value is non-finite', () => {
    const opt = renderer().buildOption(view([1, NaN, 3, 4], [0.5, 0.2, Infinity, -0.1]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number]> }>;
    expect(series[0].data).toEqual([[1, 0.5], [4, -0.1]]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const opt = renderer().buildOption(dv, { chartType: 'residual_plot', columns: { predicted: 'nope_p', residual: 'nope_r' }, options: {} }, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });
});

describe('residual_plot empty-data guard', () => {
  it('renders a themed empty state when no finite pairs exist', () => {
    const el = renderer().render(view(['a', 'b'], [NaN, Infinity]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No residuals to chart');
  });

  it('renders the chart (not the empty state) when a finite pair is present', () => {
    const el = renderer().render(view([1], [0.5]), cfg, theme());
    expect(el.type).not.toBe(EmptyChartState);
  });
});
