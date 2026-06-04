import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/gantt_chart';
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

const cfg: ChartConfig = { chartType: 'gantt_chart', columns: { task: 'task', start: 'start', end: 'end' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      task: ['Plan', 'Build', 'Bad'],
      start: ['2024-01-01', '2024-01-03', '2024-02-01'],
      end: ['2024-01-05', '2024-01-10', '2024-01-01'],
    },
    columns: [
      { name: 'task', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'start', type: 'datetime', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'end', type: 'datetime', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('gantt_chart', () => {
  const renderer = () => chartRegistry.get('gantt_chart')!.createRenderer() as EChartsBaseRenderer;

  it('registers task interval roles', () => {
    const def = chartRegistry.get('gantt_chart')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['task', 'start', 'end']);
  });

  it('renders valid task intervals on a time axis', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    expect((opt.yAxis as { data: string[]; inverse: boolean }).data).toEqual(['Plan', 'Build']);
    expect((opt.yAxis as { inverse: boolean }).inverse).toBe(true);
    const series = opt.series as Array<{ data: Array<[number, number, number, string]>; renderItem: (params: unknown, api: { coord: (value: unknown[]) => number[]; value: (index: number) => unknown; size?: (value: number[]) => number[] }) => { shape: { width: number; height: number }; style: { fill: string } } }>;
    expect(series[0].data.map((row) => row[3])).toEqual(['Plan', 'Build']);
    const datum = series[0].data[0];
    const rendered = series[0].renderItem({}, {
      coord: (value) => [Number(value[0]) / 1000, Number(value[1]) * 10],
      value: (index) => datum[index],
      size: () => [0, 20],
    });
    expect(rendered.shape.height).toBeCloseTo(11.2);
    expect(rendered.shape.width).toBeGreaterThan(1);
    expect(rendered.style.fill).toBe('#f00');
    const fallbackSize = series[0].renderItem({}, {
      coord: (value) => [Number(value[0]) / 1000, Number(value[1]) * 10],
      value: (index) => datum[index],
    });
    expect(fallbackSize.shape.height).toBe(8);
  });

  it('renders an empty state when no valid task interval exists', () => {
    const empty = view();
    empty.columnArrays.end = ['2023-01-01', 'bad', null];
    const el = chartRegistry.get('gantt_chart')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No task intervals to chart');
  });

  it('handles numeric interval values and missing configured columns', () => {
    const numeric = view();
    numeric.columnArrays.start = [1, 3, 9];
    numeric.columnArrays.end = [2, 5, 1];
    const opt = renderer().buildOption(numeric, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: Array<[number, number, number, string]> }>)[0].data.map((row) => [row[0], row[1], row[3]])).toEqual([
      [1, 2, 'Plan'],
      [3, 5, 'Build'],
    ]);

    const missing = renderer().buildOption(numeric, { ...cfg, columns: { task: 'missing', start: 'also_missing', end: 'nope' } }, theme()) as EChartsOption;
    expect((missing.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
