import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/faceted_scatter';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'faceted_scatter', columns: { x: 'x', y: 'y', facet: 'facet' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 4,
    columnArrays: { x: [1, 2, 3, 4], y: [5, 6, 7, 'bad'], facet: ['A', 'B', 'A'] },
    columns: [],
  };
}

describe('faceted_scatter', () => {
  it('registers in the relationships family', () => {
    expect(chartRegistry.get('faceted_scatter')!.family).toBe('relationships');
  });

  it('splits finite points into one grid and scatter series per facet', () => {
    const opt = (chartRegistry.get('faceted_scatter')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[][]; xAxisIndex: number; itemStyle: { color: string } }>;
    expect(opt.grid as unknown[]).toHaveLength(2);
    expect(opt.xAxis as unknown[]).toHaveLength(2);
    expect(opt.yAxis as unknown[]).toHaveLength(2);
    expect(series[0]).toMatchObject({ name: 'A', data: [[1, 5], [3, 7]], xAxisIndex: 0 });
    expect(series[1]).toMatchObject({ name: 'B', data: [[2, 6]], xAxisIndex: 1 });
    expect(series[1].itemStyle.color).toBe('#0f0');
  });

  it('uses Ungrouped for missing facet values', () => {
    const dv: DataView = { ...view(), columnArrays: { x: [1], y: [2], facet: [] }, rowCount: 1 };
    const opt = (chartRegistry.get('faceted_scatter')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ name: string }>)[0].name).toBe('Ungrouped');
  });

  it('renders an empty state when no finite points remain or columns are missing', () => {
    const dv: DataView = { ...view(), columnArrays: { x: [NaN], y: [2], facet: ['A'] }, rowCount: 1 };
    expect((chartRegistry.get('faceted_scatter')!.createRenderer().render(dv, cfg, theme()).props as { message: string }).message)
      .toBe('No faceted x/y points to chart');
    const missing: ChartConfig = { chartType: 'faceted_scatter', columns: { x: 'missing_x', y: 'missing_y', facet: 'missing_facet' }, options: {} };
    expect((chartRegistry.get('faceted_scatter')!.createRenderer().render(view(), missing, theme()).props as { message: string }).message)
      .toBe('No faceted x/y points to chart');
  });
});
