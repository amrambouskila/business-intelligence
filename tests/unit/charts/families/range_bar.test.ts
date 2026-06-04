import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/range_bar';
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

const cfg: ChartConfig = { chartType: 'range_bar', columns: { label: 'label', start: 'start', end: 'end' }, options: {} };

function view(startType: 'datetime' | 'float' = 'datetime'): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      label: ['Alpha', 'Beta', 'Bad'],
      start: startType === 'datetime' ? ['2024-01-01', '2024-01-03', '2024-02-01'] : [1, 4, 10],
      end: startType === 'datetime' ? ['2024-01-05', '2024-01-10', '2024-01-01'] : [3, 8, 2],
    },
    columns: [
      { name: 'label', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'start', type: startType, nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'end', type: startType, nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('range_bar', () => {
  const renderer = () => chartRegistry.get('range_bar')!.createRenderer() as EChartsBaseRenderer;

  it('registers label start end roles', () => {
    const def = chartRegistry.get('range_bar')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['label', 'start', 'end']);
  });

  it('renders valid datetime ranges on a time axis', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Alpha', 'Beta']);
    const series = opt.series as Array<{ data: Array<[number, number, number, string]>; renderItem: (params: unknown, api: { coord: (value: unknown[]) => number[]; value: (index: number) => unknown; size?: (value: number[]) => number[] }) => { shape: { height: number; width: number }; style: { fill: string } } }>;
    expect(series[0].data.map((row) => row[3])).toEqual(['Alpha', 'Beta']);
    const datum = series[0].data[0];
    const rendered = series[0].renderItem({}, {
      coord: (value) => [Number(value[0]) / 1000, Number(value[1]) * 10],
      value: (index) => datum[index],
      size: () => [0, 24],
    });
    expect(rendered.shape.height).toBe(12);
    expect(rendered.shape.width).toBeGreaterThan(1);
    expect(rendered.style.fill).toBe('#f00');
    const fallbackSize = series[0].renderItem({}, {
      coord: (value) => [Number(value[0]) / 1000, Number(value[1]) * 10],
      value: (index) => datum[index],
    });
    expect(fallbackSize.shape.height).toBe(8);
  });

  it('uses a value axis for numeric ranges and renders empty state when invalid', () => {
    const opt = renderer().buildOption(view('float'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('value');
    const empty = view('float');
    empty.columnArrays.end = [0, 1, 2];
    const el = chartRegistry.get('range_bar')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No ranges to chart');
  });

  it('handles invalid date strings and missing configured columns', () => {
    const invalid = view();
    invalid.columnArrays.start = ['bad date', '2024-01-03'];
    invalid.columnArrays.end = ['2024-01-05', '2024-01-04'];
    const opt = renderer().buildOption(invalid, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: Array<[number, number, number, string]> }>)[0].data.map((row) => row[3])).toEqual(['Beta']);

    const missing = renderer().buildOption(invalid, { ...cfg, columns: { label: 'missing', start: 'also_missing', end: 'nope' } }, theme()) as EChartsOption;
    expect((missing.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
