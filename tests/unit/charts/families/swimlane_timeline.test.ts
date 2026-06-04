import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/swimlane_timeline';
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

const cfg: ChartConfig = { chartType: 'swimlane_timeline', columns: { lane: 'lane', task: 'task', start: 'start', end: 'end' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      lane: ['Product', 'Engineering', 'Product', null],
      task: ['Plan', 'Build', 'Launch', 'Skip'],
      start: ['2024-01-01', '2024-01-03', '2024-01-20', '2024-02-01'],
      end: ['2024-01-05', '2024-01-10', '2024-01-24', '2024-02-05'],
    },
    columns: [
      { name: 'lane', type: 'category', nullable: true, uniqueCount: 2, nullCount: 1 },
      { name: 'task', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'start', type: 'datetime', nullable: false, uniqueCount: 4, nullCount: 0 },
      { name: 'end', type: 'datetime', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  };
}

describe('swimlane_timeline', () => {
  const renderer = () => chartRegistry.get('swimlane_timeline')!.createRenderer() as EChartsBaseRenderer;

  it('registers lane task interval roles', () => {
    const def = chartRegistry.get('swimlane_timeline')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['lane', 'task', 'start', 'end']);
  });

  it('groups valid intervals by first-seen lane', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Product', 'Engineering']);
    const series = opt.series as Array<{ data: Array<[number, number, number, string, string]>; renderItem: (params: unknown, api: { coord: (value: unknown[]) => number[]; value: (index: number) => unknown; size?: (value: number[]) => number[] }) => { shape: { height: number; width: number }; style: { fill: string } } }>;
    expect(series[0].data.map((row) => [row[4], row[3]])).toEqual([
      ['Product', 'Plan'],
      ['Engineering', 'Build'],
      ['Product', 'Launch'],
    ]);
    const datum = series[0].data[1];
    const rendered = series[0].renderItem({}, {
      coord: (value) => [Number(value[0]) / 1000, Number(value[1]) * 10],
      value: (index) => datum[index],
      size: () => [0, 30],
    });
    expect(rendered.shape.height).toBe(12.6);
    expect(rendered.style.fill).toBe('#0f0');
    const fallbackSize = series[0].renderItem({}, {
      coord: (value) => [Number(value[0]) / 1000, Number(value[1]) * 10],
      value: (index) => datum[index],
    });
    expect(fallbackSize.shape.height).toBe(8);
  });

  it('renders an empty state when intervals are invalid', () => {
    const empty = view();
    empty.columnArrays.start = ['bad', null];
    empty.columnArrays.end = ['also bad', null];
    const el = chartRegistry.get('swimlane_timeline')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No swimlane intervals to chart');
  });

  it('handles numeric interval values and missing configured columns', () => {
    const numeric = view();
    numeric.columnArrays.start = [1, 3, 9];
    numeric.columnArrays.end = [2, 5, 1];
    const opt = renderer().buildOption(numeric, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: Array<[number, number, number, string, string]> }>)[0].data.map((row) => [row[0], row[1], row[3]])).toEqual([
      [1, 2, 'Plan'],
      [3, 5, 'Build'],
    ]);

    const missing = renderer().buildOption(numeric, { ...cfg, columns: { lane: 'missing', task: 'also_missing', start: 'nope', end: 'none' } }, theme()) as EChartsOption;
    expect((missing.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
