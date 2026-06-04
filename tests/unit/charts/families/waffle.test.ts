import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/waffle';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('waffle registration', () => {
  it('registers under type "waffle" with the categorical family', () => {
    const def = chartRegistry.get('waffle');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('waffle buildOption', () => {
  const def = () => chartRegistry.get('waffle')!;

  it('allocates a 10 by 10 scatter grid proportionally and distributes rounding remainder', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c'], val: [1, 1, 1] },
      columns: [],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'waffle', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { show: boolean; min: number; max: number }).show).toBe(false);
    expect((opt.xAxis as { min: number; max: number }).min).toBe(0);
    expect((opt.xAxis as { min: number; max: number }).max).toBe(9);

    const series = opt.series as Array<{ name: string; type: string; data: number[][]; symbol: string; symbolSize: number; itemStyle: { color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['a', 'b', 'c']);
    expect(series.map((s) => s.data.length)).toEqual([34, 33, 33]);
    expect(series[0].data[0]).toEqual([0, 9]);
    expect(series[0].symbol).toBe('rect');
    expect(series[0].symbolSize).toBe(14);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('drops non-positive values and renders the empty state when none remain', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b'], val: [0, -2] },
      columns: [],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'waffle', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive values to display');
  });

  it('aggregates duplicate categories before computing proportions', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'a', 'b'], val: [20, 30, 50] },
      columns: [],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'waffle', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[][] }>;
    expect(series.map((s) => [s.name, s.data.length])).toEqual([['a', 50], ['b', 50]]);
  });
});
