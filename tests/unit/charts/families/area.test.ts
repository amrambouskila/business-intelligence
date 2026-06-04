import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/area';
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

describe('area registration', () => {
  it('registers under type "area" with the time-series family', () => {
    const def = chartRegistry.get('area');
    expect(def).toBeDefined();
    expect(def!.family).toBe('time-series');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('area buildOption', () => {
  const def = () => chartRegistry.get('area')!;

  it('uses category axis when x is not datetime and fills the series', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], y: [1, 2, 3] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'y', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'area', columns: { x: 'cat', y: 'y' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['a', 'b', 'c']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
    const series = opt.series as Array<{ type: string; data: unknown[]; areaStyle: unknown }>;
    expect(series[0].type).toBe('line');
    expect(series[0].areaStyle).toEqual({});
    expect(series[0].data).toEqual([1, 2, 3]);
  });

  it('uses time axis and paired [x, y] data when x is datetime', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { ts: ['2026-01-01', '2026-01-02'], y: [10, 20] },
      columns: [
        { name: 'ts', type: 'datetime', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'y', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'area', columns: { x: 'ts', y: 'y' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('time');
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([['2026-01-01', 10], ['2026-01-02', 20]]);
  });

  it('falls back to empty column arrays if references are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'area', columns: { x: 'missing', y: 'also_missing' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  const categoryView = (): DataView => ({
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { cat: ['a', 'b', 'c'], y: [1, 2, 3] },
    columns: [
      { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'y', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  });

  it('defaults the smooth option to false', () => {
    const cfg: ChartConfig = { chartType: 'area', columns: { x: 'cat', y: 'y' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(categoryView(), cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ smooth: boolean }>)[0].smooth).toBe(false);
  });

  it('reflects the smooth option when enabled', () => {
    const cfg: ChartConfig = { chartType: 'area', columns: { x: 'cat', y: 'y' }, options: { smooth: true } };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(categoryView(), cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ smooth: boolean }>)[0].smooth).toBe(true);
  });
});
