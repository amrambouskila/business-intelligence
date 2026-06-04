import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/cleveland_dot';
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

describe('cleveland_dot registration', () => {
  it('registers under type "cleveland_dot" with the categorical family', () => {
    const def = chartRegistry.get('cleveland_dot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('cleveland_dot buildOption', () => {
  const def = () => chartRegistry.get('cleveland_dot')!;

  it('builds a horizontal category axis and aggregates repeated categories', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'a'], val: [10, 5, 7] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'cleveland_dot', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { type: string }).type).toBe('value');
    expect((opt.yAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'b']);

    const series = opt.series as Array<{ type: string; data: number[]; symbolSize: number; itemStyle: { color: string } }>;
    expect(series[0].type).toBe('scatter');
    expect(series[0].data).toEqual([17, 5]);
    expect(series[0].symbolSize).toBe(12);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('renders the empty state when no finite values remain', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a'], val: [Number.NaN] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'cleveland_dot', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No finite values to display');
  });
});
