import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/dumbbell';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

interface CustomSeries {
  type: string;
  data: number[][];
  renderItem: (params: unknown, api: { value: (d: number) => number; coord: (p: number[]) => number[] }) => unknown;
}

describe('dumbbell registration', () => {
  it('registers under type "dumbbell" with the categorical family', () => {
    const def = chartRegistry.get('dumbbell');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('dumbbell buildOption', () => {
  const def = () => chartRegistry.get('dumbbell')!;

  it('builds connector, start-dot, and end-dot series from finite paired values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a', 'b', 'c', 'd'], va: [10, 'x', Number.NaN, 40], vb: [20, 30, 50, Infinity] },
      columns: [
        { name: 'cat', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
        { name: 'va', type: 'integer', nullable: true, uniqueCount: 4, nullCount: 0 },
        { name: 'vb', type: 'integer', nullable: true, uniqueCount: 4, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'dumbbell', columns: { category: 'cat', value_a: 'va', value_b: 'vb' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.yAxis as { data: string[] }).data).toEqual(['a']);
    const series = opt.series as Array<{ type: string; data: number[] | number[][]; itemStyle?: { color: string }; symbolSize?: number }>;
    expect(series[0].type).toBe('custom');
    expect(series[0].data).toEqual([[0, 10, 20]]);
    expect(series[1]).toMatchObject({ name: 'Value A', type: 'scatter', data: [10], symbolSize: 12, itemStyle: { color: '#f00' } });
    expect(series[2]).toMatchObject({ name: 'Value B', type: 'scatter', data: [20], symbolSize: 12, itemStyle: { color: '#0f0' } });
  });

  it('draws connector lines between the paired values at the category band center', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['a'], va: [20], vb: [10] },
      columns: [],
      rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'dumbbell', columns: { category: 'cat', value_a: 'va', value_b: 'vb' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const connector = (opt.series as CustomSeries[])[0];
    const element = connector.renderItem({}, {
      value: (d: number) => connector.data[0][d],
      coord: ([x, y]: number[]) => [x * 10, y * 20],
    }) as { type: string; shape: Record<string, number>; style: { stroke: string; lineWidth: number } };

    expect(element.type).toBe('line');
    expect(element.shape).toEqual({ x1: 100, y1: 0, x2: 200, y2: 0 });
    expect(element.style).toEqual({ stroke: '#666', lineWidth: 2 });
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const cfg: ChartConfig = { chartType: 'dumbbell', columns: { category: 'cat', value_a: 'va', value_b: 'vb' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No paired values to display');
  });
});
