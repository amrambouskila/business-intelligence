import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/scatter';
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

describe('scatter registration', () => {
  it('registers under type "scatter" with the relationships family', () => {
    const def = chartRegistry.get('scatter');
    expect(def).toBeDefined();
    expect(def!.family).toBe('relationships');
  });
});

describe('scatter buildOption', () => {
  it('falls back to empty arrays when referenced columns are missing', () => {
    const def = chartRegistry.get('scatter')!;
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'scatter', columns: { x: 'nope_x', y: 'nope_y' }, options: {} };
    const opt = (def.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  it('builds a series of [x, y] points', () => {
    const def = chartRegistry.get('scatter')!;
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { x: [1, 2, 3], y: [4, 5, 6] },
      columns: [
        { name: 'x', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'y', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'scatter', columns: { x: 'x', y: 'y' }, options: {} };
    const opt = (def.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number]> }>;
    expect(series[0].data).toEqual([[1, 4], [2, 5], [3, 6]]);
  });
});
