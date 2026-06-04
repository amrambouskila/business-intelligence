import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/regression_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const view = (x: unknown[], y: unknown[]): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { x, y },
  columns: [
    { name: 'x', type: 'float', nullable: false, uniqueCount: x.length, nullCount: 0 },
    { name: 'y', type: 'float', nullable: false, uniqueCount: y.length, nullCount: 0 },
  ],
  rowCount: x.length,
});

type Series = { name: string; type: string; data: Array<[number, number]>; itemStyle?: { color: string; opacity: number }; lineStyle?: { color: string; width: number } };

describe('regression_plot registration', () => {
  it('registers under the relationships family', () => {
    const def = chartRegistry.get('regression_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('relationships');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('regression_plot buildOption', () => {
  it('builds finite scatter points and an OLS trend line', () => {
    const cfg: ChartConfig = { chartType: 'regression_plot', columns: { x: 'x', y: 'y' }, options: {} };
    const opt = (chartRegistry.get('regression_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([1, 2, 3, Infinity], [3, 5, 7, 9]), cfg, theme()) as EChartsOption;
    const series = opt.series as Series[];
    expect(series[0]).toMatchObject({ name: 'Observed', type: 'scatter', data: [[1, 3], [2, 5], [3, 7]] });
    expect(series[1]).toMatchObject({ name: 'Linear fit', type: 'line', data: [[1, 3], [3, 7]] });
    expect(series[0].itemStyle).toEqual({ color: '#f00', opacity: 0.75 });
    expect(series[1].lineStyle).toEqual({ color: '#0f0', width: 2 });
  });

  it('falls back to a horizontal fit when x has zero variance', () => {
    const cfg: ChartConfig = { chartType: 'regression_plot', columns: { x: 'x', y: 'y' }, options: {} };
    const opt = (chartRegistry.get('regression_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([2, 2], [4, 8]), cfg, theme()) as EChartsOption;
    const series = opt.series as Series[];
    expect(series[1].data).toEqual([[2, 6], [2, 6]]);
  });

  it('returns empty series data for missing columns', () => {
    const cfg: ChartConfig = { chartType: 'regression_plot', columns: { x: 'missing_x', y: 'missing_y' }, options: {} };
    const opt = (chartRegistry.get('regression_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([1], [2]), cfg, theme()) as EChartsOption;
    const series = opt.series as Series[];
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });
});
