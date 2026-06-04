import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/colored_scatter';
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

const view = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { x: [1, 2, 3, Infinity, 4], y: [5, 6, 7, 8, 'bad'], group: ['A', 'B', 'A', 'B', 'C'] },
  columns: [
    { name: 'x', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
    { name: 'y', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
    { name: 'group', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
  ],
  rowCount: 5,
});

type ScatterSeries = { name: string; type: string; data: Array<[number, number]>; symbolSize: number; itemStyle: { color: string; opacity: number } };

describe('colored_scatter registration', () => {
  it('registers under the relationships family', () => {
    const def = chartRegistry.get('colored_scatter');
    expect(def).toBeDefined();
    expect(def!.family).toBe('relationships');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('colored_scatter buildOption', () => {
  it('groups finite points by category and colors each group', () => {
    const cfg: ChartConfig = { chartType: 'colored_scatter', columns: { x: 'x', y: 'y', color_group: 'group' }, options: {} };
    const opt = (chartRegistry.get('colored_scatter')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as ScatterSeries[];
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ name: 'A', type: 'scatter', data: [[1, 5], [3, 7]], symbolSize: 6 });
    expect(series[1]).toMatchObject({ name: 'B', type: 'scatter', data: [[2, 6]] });
    expect(series[0].itemStyle).toEqual({ color: '#f00', opacity: 0.75 });
    expect(series[1].itemStyle.color).toBe('#0f0');
  });

  it('uses option overrides and falls back to empty arrays for missing columns', () => {
    const cfg: ChartConfig = {
      chartType: 'colored_scatter',
      columns: { x: 'missing_x', y: 'missing_y', color_group: 'missing_g' },
      options: { pointSize: 11, opacity: 0.4 },
    };
    const opt = (chartRegistry.get('colored_scatter')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect(opt.series).toEqual([]);
  });

  it('uses the Ungrouped label when a finite point has no group value', () => {
    const dv: DataView = { ...view(), columnArrays: { x: [1], y: [2], group: [] }, rowCount: 1 };
    const cfg: ChartConfig = { chartType: 'colored_scatter', columns: { x: 'x', y: 'y', color_group: 'group' }, options: { pointSize: 9, opacity: 0.5 } };
    const opt = (chartRegistry.get('colored_scatter')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as ScatterSeries[];
    expect(series[0].name).toBe('Ungrouped');
    expect(series[0].symbolSize).toBe(9);
    expect(series[0].itemStyle.opacity).toBe(0.5);
  });
});
