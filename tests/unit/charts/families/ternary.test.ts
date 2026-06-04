import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/ternary';
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

const view = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { a: [1, 0, 0, 0, Infinity], b: [0, 1, 0, 0, 1], c: [0, 0, 1, 0, 1] },
  columns: [
    { name: 'a', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
    { name: 'b', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
    { name: 'c', type: 'float', nullable: false, uniqueCount: 5, nullCount: 0 },
  ],
  rowCount: 5,
});

type Series = { name: string; type: string; data: number[][]; lineStyle?: { color: string; width: number }; itemStyle?: { color: string; opacity: number } };

describe('ternary registration', () => {
  it('registers under the relationships family', () => {
    const def = chartRegistry.get('ternary');
    expect(def).toBeDefined();
    expect(def!.family).toBe('relationships');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('ternary buildOption', () => {
  it('projects positive finite triples into barycentric coordinates', () => {
    const cfg: ChartConfig = { chartType: 'ternary', columns: { a: 'a', b: 'b', c: 'c' }, options: {} };
    const opt = (chartRegistry.get('ternary')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Series[];
    expect(series[0]).toMatchObject({ name: 'Boundary', type: 'line', lineStyle: { color: '#333', width: 2 } });
    expect(series[1].data).toHaveLength(3);
    expect(series[1].data[0]).toEqual([0, 0, 1, 0, 0]);
    expect(series[1].data[1]).toEqual([1, 0, 0, 1, 0]);
    expect(series[1].data[2][0]).toBeCloseTo(0.5);
    expect(series[1].data[2][1]).toBeCloseTo(Math.sqrt(3) / 2);
    expect(series[1].itemStyle).toEqual({ color: '#f00', opacity: 0.8 });
  });

  it('uses empty point data for missing columns', () => {
    const cfg: ChartConfig = { chartType: 'ternary', columns: { a: 'missing_a', b: 'missing_b', c: 'missing_c' }, options: {} };
    const opt = (chartRegistry.get('ternary')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Series[];
    expect(series[1].data).toEqual([]);
  });

  it('drops rows with non-numeric component values in any component column', () => {
    const dv: DataView = { ...view(), columnArrays: { a: ['bad', 1, 1], b: [1, 'bad', 1], c: [1, 1, 'bad'] }, rowCount: 3 };
    const cfg: ChartConfig = { chartType: 'ternary', columns: { a: 'a', b: 'b', c: 'c' }, options: {} };
    const opt = (chartRegistry.get('ternary')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Series[];
    expect(series[1].data).toEqual([]);
  });
});
