import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/forest_plot';
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

const cfg: ChartConfig = { chartType: 'forest_plot', columns: { label: 'label', estimate: 'est', lower: 'lo', upper: 'hi' }, options: {} };
type CustomSeries = {
  type: string;
  data: number[][];
  renderItem: (params: unknown, api: { value: (d: number) => number; coord: (p: number[]) => number[] }) => unknown;
};

describe('forest_plot registration', () => {
  it('registers under type "forest_plot" in the statistical family', () => {
    const def = chartRegistry.get('forest_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('forest_plot buildOption', () => {
  const def = () => chartRegistry.get('forest_plot')!;

  it('builds horizontal interval and estimate series, dropping invalid rows', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        label: ['A', 'B', 'C', 'D', 'E'],
        est: [10, 'bad', 30, 40, 50],
        lo: [8, 17, Number.NaN, 35, 45],
        hi: [12, 23, 35, Infinity, 'bad'],
      },
      columns: [],
      rowCount: 5,
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.yAxis as { data: string[] }).data).toEqual(['A']);
    const series = opt.series as Array<{ type: string; data: number[] | number[][]; symbolSize?: number; itemStyle?: { color: string } }>;
    expect(series[0].type).toBe('custom');
    expect(series[0].data).toEqual([[0, 8, 12]]);
    expect(series[1]).toMatchObject({ type: 'scatter', data: [10], symbolSize: 12, itemStyle: { color: '#f00' } });
  });

  it('draws interval lines between lower and upper estimates', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: { label: ['A'], est: [10], lo: [8], hi: [12] }, columns: [], rowCount: 1 };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as CustomSeries[])[0];
    const datum = series.data[0];
    const element = series.renderItem({}, {
      value: (d: number) => datum[d],
      coord: ([x, y]: number[]) => [x * 10, y * 20],
    }) as { type: string; shape: Record<string, number>; style: { stroke: string; lineWidth: number } };

    expect(element.type).toBe('line');
    expect(element.shape).toEqual({ x1: 80, y1: 0, x2: 120, y2: 0 });
    expect(element.style).toEqual({ stroke: '#f00', lineWidth: 2 });
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No intervals to chart');
  });
});
