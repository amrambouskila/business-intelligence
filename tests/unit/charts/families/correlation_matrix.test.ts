import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/correlation_matrix';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'correlation_matrix', columns: { row: 'row', col: 'col', value: 'value' }, options: {} };

function dv(columnArrays: DataView['columnArrays']): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: 4 };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('correlation_matrix')!.createRenderer() as EChartsBaseRenderer;
}

describe('correlation_matrix registration', () => {
  it('registers as an ECharts matrix chart', () => {
    const def = chartRegistry.get('correlation_matrix')!;
    expect(def.family).toBe('matrix');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['row', 'col', 'value']);
  });
});

describe('correlation_matrix buildOption', () => {
  it('builds a labeled diverging heatmap with correlation bounds', () => {
    const opt = renderer().buildOption(dv({
      row: ['a', 'a', 'b', 'b'],
      col: ['a', 'b', 'a', 'b'],
      value: [1, -0.4, -0.4, 1],
    }), cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['a', 'b']);
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'b']);
    const series = (opt.series as Array<{ type: string; data: number[][]; label: { show: boolean; color: string } }>)[0];
    expect(series.type).toBe('heatmap');
    expect(series.data).toEqual([[0, 0, 1], [1, 0, -0.4], [0, 1, -0.4], [1, 1, 1]]);
    expect(series.label).toEqual({ show: true, color: '#fff', fontSize: 10 });

    const visualMap = opt.visualMap as { min: number; max: number; inRange: { color: string[] }; textStyle: { color: string } };
    expect(visualMap.min).toBe(-1);
    expect(visualMap.max).toBe(1);
    expect(visualMap.inRange.color).toEqual(['#f00', '#fff', '#0f0']);
    expect(visualMap.textStyle.color).toBe('#666');
  });

  it('keeps non-finite cells as NaN while deriving the finite range', () => {
    const opt = renderer().buildOption(dv({
      row: ['a', 'b'],
      col: ['a', 'b'],
      value: [NaN, 0.25],
    }), cfg, theme()) as EChartsOption;

    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([[0, 0, NaN], [1, 1, 0.25]]);
  });

  it('falls back to empty series data when referenced columns are missing', () => {
    const opt = renderer().buildOption(dv({}), cfg, theme()) as EChartsOption;
    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([]);
    expect((opt.visualMap as { min: number; max: number }).min).toBe(-1);
  });
});

describe('correlation_matrix empty guard', () => {
  it('renders the empty state when no finite correlations remain', () => {
    const el = renderer().render(dv({ row: ['a'], col: ['a'], value: [Infinity] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No correlation values to chart');
  });

  it('renders a chart when at least one finite correlation exists', () => {
    const el = renderer().render(dv({ row: ['a'], col: ['a'], value: [1] }), cfg, theme());
    expect(el.props).toHaveProperty('option');
  });
});
