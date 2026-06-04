import { describe, it, expect } from 'vitest';
import '@/charts/families/composition/pie';
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
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('pie registration', () => {
  it('registers under type "pie" with the composition family', () => {
    const def = chartRegistry.get('pie');
    expect(def).toBeDefined();
    expect(def!.family).toBe('composition');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('pie buildOption', () => {
  const def = () => chartRegistry.get('pie')!;

  it('builds a pie series of {name, value} slices colored from the palette', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [10, 20, 30] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'pie', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; radius: string; data: Array<{ name: string; value: number; itemStyle: { color: string } }> }>;
    expect(series[0].type).toBe('pie');
    expect(series[0].radius).toBe('70%');
    expect(series[0].data).toEqual([
      { name: 'a', value: 10, itemStyle: { color: '#f00' } },
      { name: 'b', value: 20, itemStyle: { color: '#0f0' } },
      { name: 'c', value: 30, itemStyle: { color: '#f00' } },
    ]);
    expect((opt.tooltip as { trigger: string }).trigger).toBe('item');
    expect(opt.xAxis).toBeUndefined();
    expect(opt.yAxis).toBeUndefined();
    expect(opt.grid).toBeUndefined();
  });

  it('falls back to empty column arrays when references are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'pie', columns: { category: 'missing', value: 'also_missing' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  it('drops slices whose value is not finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [10, NaN, 30] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'pie', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<{ name: string; value: number }> }>;
    expect(series[0].data.map((s) => s.name)).toEqual(['a', 'c']);
  });

  it('reports the empty state when present columns have no finite values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b'], val: [NaN, NaN] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'pie', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = (def().createRenderer() as EChartsBaseRenderer).render(dv, cfg, theme());
    expect(el.type).toBe(EmptyChartState);
  });
});
