import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/distance_matrix_heatmap';
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

const cfg: ChartConfig = { chartType: 'distance_matrix_heatmap', columns: { row: 'row', col: 'col', value: 'distance' }, options: {} };

function dv(columnArrays: DataView['columnArrays']): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: 4 };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('distance_matrix_heatmap')!.createRenderer() as EChartsBaseRenderer;
}

describe('distance_matrix_heatmap registration', () => {
  it('registers as an ECharts matrix chart', () => {
    const def = chartRegistry.get('distance_matrix_heatmap')!;
    expect(def.family).toBe('matrix');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['row', 'col', 'value']);
  });
});

describe('distance_matrix_heatmap buildOption', () => {
  it('builds a sequential heatmap and clamps the visual minimum at zero', () => {
    const opt = renderer().buildOption(dv({
      row: ['a', 'a', 'b', 'b'],
      col: ['a', 'b', 'a', 'b'],
      distance: [0, 4, -2, 0],
    }), cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['a', 'b']);
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'b']);
    expect(((opt.series as Array<{ type: string; data: number[][] }>)[0])).toEqual({
      type: 'heatmap',
      data: [[0, 0, 0], [1, 0, 4], [0, 1, -2], [1, 1, 0]],
    });

    const visualMap = opt.visualMap as { min: number; max: number; inRange: { color: string[] }; textStyle: { color: string } };
    expect(visualMap.min).toBe(0);
    expect(visualMap.max).toBe(4);
    expect(visualMap.inRange.color).toEqual(['#000', '#fff']);
    expect(visualMap.textStyle.color).toBe('#666');
  });

  it('falls back to empty series data when referenced columns are missing', () => {
    const opt = renderer().buildOption(dv({}), cfg, theme()) as EChartsOption;
    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([]);
    expect((opt.visualMap as { min: number; max: number }).max).toBe(1);
  });
});

describe('distance_matrix_heatmap empty guard', () => {
  it('renders the empty state when no finite distances remain', () => {
    const el = renderer().render(dv({ row: ['a'], col: ['a'], distance: [NaN] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No distance values to chart');
  });

  it('renders a chart when at least one finite distance exists', () => {
    const el = renderer().render(dv({ row: ['a'], col: ['a'], distance: [0] }), cfg, theme());
    expect(el.props).toHaveProperty('option');
  });
});
