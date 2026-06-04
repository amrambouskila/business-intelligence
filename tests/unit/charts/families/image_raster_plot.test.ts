import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/image_raster_plot';
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

const cfg: ChartConfig = { chartType: 'image_raster_plot', columns: { row: 'row', col: 'col', intensity: 'intensity' }, options: {} };

function dv(columnArrays: DataView['columnArrays']): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: 4 };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('image_raster_plot')!.createRenderer() as EChartsBaseRenderer;
}

describe('image_raster_plot registration', () => {
  it('registers intensity as the numeric role', () => {
    const def = chartRegistry.get('image_raster_plot')!;
    expect(def.family).toBe('matrix');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['row', 'col', 'intensity']);
  });
});

describe('image_raster_plot buildOption', () => {
  it('builds an inverted-row raster heatmap using intensity values', () => {
    const opt = renderer().buildOption(dv({
      row: [0, 0, 1, 1],
      col: [0, 1, 0, 1],
      intensity: [5, 15, 25, 35],
    }), cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['0', '1']);
    expect((opt.yAxis as { data: string[]; inverse: boolean }).data).toEqual(['0', '1']);
    expect((opt.yAxis as { inverse: boolean }).inverse).toBe(true);
    const series = (opt.series as Array<{ type: string; data: number[][]; progressive: number }>)[0];
    expect(series).toEqual({
      type: 'heatmap',
      data: [[0, 0, 5], [1, 0, 15], [0, 1, 25], [1, 1, 35]],
      progressive: 0,
    });

    const visualMap = opt.visualMap as { min: number; max: number; inRange: { color: string[] } };
    expect(visualMap.min).toBe(5);
    expect(visualMap.max).toBe(35);
    expect(visualMap.inRange.color).toEqual(['#000', '#fff']);
  });

  it('falls back to empty series data when referenced columns are missing', () => {
    const opt = renderer().buildOption(dv({}), cfg, theme()) as EChartsOption;
    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([]);
    expect((opt.visualMap as { min: number; max: number }).min).toBe(0);
  });
});

describe('image_raster_plot empty guard', () => {
  it('renders the empty state when no finite intensities remain', () => {
    const el = renderer().render(dv({ row: [0], col: [0], intensity: [Infinity] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No raster intensities to chart');
  });

  it('renders a chart when at least one finite intensity exists', () => {
    const el = renderer().render(dv({ row: [0], col: [0], intensity: [5] }), cfg, theme());
    expect(el.props).toHaveProperty('option');
  });
});
