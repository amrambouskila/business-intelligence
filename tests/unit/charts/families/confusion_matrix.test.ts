import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/confusion_matrix';
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

const cfg: ChartConfig = { chartType: 'confusion_matrix', columns: { actual: 'actual', predicted: 'predicted', count: 'count' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { actual: ['A', 'A', 'B'], predicted: ['A', 'B', 'B'], count: [8, 2, 9] },
    columns: [
      { name: 'actual', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'predicted', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'count', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('confusion_matrix', () => {
  const renderer = () => chartRegistry.get('confusion_matrix')!.createRenderer() as EChartsBaseRenderer;

  it('registers actual, predicted, and count roles', () => {
    const def = chartRegistry.get('confusion_matrix')!;
    expect(def.family).toBe('matrix');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['actual', 'predicted', 'count']);
  });

  it('renders labeled heatmap cells and themed visual map', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { name: string; data: string[] }).name).toBe('Predicted');
    expect((opt.yAxis as { name: string; data: string[] }).name).toBe('Actual');
    const series = opt.series as Array<{ data: Array<[number, number, number]>; label: { color: string; formatter: (params: { value: [number, number, number] }) => string } }>;
    expect(series[0].data).toEqual([[0, 0, 8], [1, 0, 2], [1, 1, 9]]);
    expect(series[0].label.color).toBe('#fff');
    expect(series[0].label.formatter({ value: [1, 0, 2] })).toBe('2');
    expect((opt.visualMap as { min: number; max: number }).max).toBe(9);
  });

  it('renders an empty state when no finite counts exist', () => {
    const empty = view();
    empty.columnArrays.count = [NaN];
    const el = chartRegistry.get('confusion_matrix')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No confusion-matrix values to chart');
  });

  it('falls back to empty cells when role columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    expect((opt.visualMap as { min: number; max: number }).max).toBe(1);
  });
});
