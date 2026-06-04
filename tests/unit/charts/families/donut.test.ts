import { describe, it, expect } from 'vitest';
import '@/charts/families/composition/donut';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('donut registration', () => {
  it('registers under type "donut" with the composition family', () => {
    const def = chartRegistry.get('donut');
    expect(def).toBeDefined();
    expect(def!.family).toBe('composition');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('donut buildOption', () => {
  const def = () => chartRegistry.get('donut')!;

  const categoryView = (): DataView => ({
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { cat: ['a', 'b', 'c'], val: [10, 20, 30] },
    columns: [
      { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  });

  type PieSeries = { type: string; radius: [string, string]; data: Array<{ name: string; value: number; itemStyle: { color: string } }> };

  it('builds a pie series with a ring radius and slice data colored from the palette', () => {
    const cfg: ChartConfig = { chartType: 'donut', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(categoryView(), cfg, theme()) as EChartsOption;
    const series = (opt.series as PieSeries[])[0];
    expect(series.type).toBe('pie');
    expect(series.radius).toEqual(['40%', '70%']);
    expect(series.data).toEqual([
      { name: 'a', value: 10, itemStyle: { color: '#f00' } },
      { name: 'b', value: 20, itemStyle: { color: '#0f0' } },
      { name: 'c', value: 30, itemStyle: { color: '#f00' } },
    ]);
  });

  it('drops slices whose value is not finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [10, Number.NaN, 30] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: true, uniqueCount: 2, nullCount: 1 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'donut', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as PieSeries[])[0];
    expect(series.data.map((s) => s.name)).toEqual(['a', 'c']);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'donut', columns: { category: 'nope_c', value: 'nope_v' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  it('reports empty when there are no finite slices', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'donut', columns: { category: 'nope_c', value: 'nope_v' }, options: {} };
    const renderer = def().createRenderer() as EChartsBaseRenderer & {
      isEmpty(d: DataView, c: ChartConfig): boolean;
      emptyMessage(): string;
    };
    expect(renderer.isEmpty(dv, cfg)).toBe(true);
    expect(renderer.emptyMessage()).toBe('No values to chart');
  });

  it('reports non-empty when at least one finite slice exists', () => {
    const cfg: ChartConfig = { chartType: 'donut', columns: { category: 'cat', value: 'val' }, options: {} };
    const renderer = def().createRenderer() as EChartsBaseRenderer & { isEmpty(d: DataView, c: ChartConfig): boolean };
    expect(renderer.isEmpty(categoryView(), cfg)).toBe(false);
  });
});
