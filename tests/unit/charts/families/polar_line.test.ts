import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/polar_line';
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
  columnArrays: { theta: [180, 0, 90, NaN], r: [3, 1, 2, 4] },
  columns: [
    { name: 'theta', type: 'float', nullable: false, uniqueCount: 4, nullCount: 0 },
    { name: 'r', type: 'float', nullable: false, uniqueCount: 4, nullCount: 0 },
  ],
  rowCount: 4,
});

type Series = { type: string; coordinateSystem: string; data: Array<[number, number]>; lineStyle: { color: string; width: number }; showSymbol: boolean };

describe('polar_line registration', () => {
  it('registers under the relationships family', () => {
    const def = chartRegistry.get('polar_line');
    expect(def).toBeDefined();
    expect(def!.family).toBe('relationships');
  });
});

describe('polar_line buildOption', () => {
  it('sorts finite polar points by theta before drawing the line', () => {
    const cfg: ChartConfig = { chartType: 'polar_line', columns: { theta: 'theta', r: 'r' }, options: {} };
    const opt = (chartRegistry.get('polar_line')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = (opt.series as Series[])[0];
    expect(series).toMatchObject({
      type: 'line',
      coordinateSystem: 'polar',
      data: [[1, 0], [2, 90], [3, 180]],
      showSymbol: false,
      lineStyle: { color: '#f00', width: 2 },
    });
  });

  it('uses empty arrays when referenced columns are missing', () => {
    const cfg: ChartConfig = { chartType: 'polar_line', columns: { theta: 'missing_theta', r: 'missing_r' }, options: {} };
    const opt = (chartRegistry.get('polar_line')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.series as Series[])[0].data).toEqual([]);
  });
});
