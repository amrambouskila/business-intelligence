import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/confusion_matrix_chart';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { EmptyChartState } from '@/charts/renderers/EmptyChartState';
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

const cfg: ChartConfig = { chartType: 'confusion_matrix_chart', columns: { actual: 'actual', predicted: 'predicted', count: 'count' }, options: {} };

function view(counts: unknown[] = [8, 2, 9]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { actual: ['A', 'A', 'B'], predicted: ['A', 'B', 'B'], count: counts },
    columns: [
      { name: 'actual', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'predicted', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'count', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('confusion_matrix_chart', () => {
  const renderer = () => chartRegistry.get('confusion_matrix_chart')!.createRenderer() as EChartsBaseRenderer;

  it('registers as the statistical catalog confusion matrix chart', () => {
    const def = chartRegistry.get('confusion_matrix_chart')!;
    expect(def.family).toBe('statistical');
    expect(def.name).toBe('Confusion Matrix Chart');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['actual', 'predicted', 'count']);
  });

  it('renders labeled classification heatmap cells and themed visual map', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { name: string; data: string[] }).name).toBe('Predicted');
    expect((opt.yAxis as { name: string; data: string[] }).name).toBe('Actual');
    const series = opt.series as Array<{ data: Array<[number, number, number]>; label: { color: string; formatter: (params: { value: [number, number, number] }) => string } }>;
    expect(series[0].data).toEqual([[0, 0, 8], [1, 0, 2], [1, 1, 9]]);
    expect(series[0].label.color).toBe('#fff');
    expect(series[0].label.formatter({ value: [1, 0, 2] })).toBe('2');
    expect((opt.visualMap as { min: number; max: number; inRange: { color: string[] } }).max).toBe(9);
    expect((opt.visualMap as { inRange: { color: string[] } }).inRange.color).toEqual(['#000', '#fff']);
  });

  it('renders an empty state when no finite classification counts exist', () => {
    const el = renderer().render(view([NaN, 'bad', undefined]), cfg, theme());
    expect(el.type).toBe(EmptyChartState);
    expect((el.props as { message?: string }).message).toBe('No classification counts to chart');
  });

  it('falls back to empty cells when role columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
    expect((opt.visualMap as { min: number; max: number }).max).toBe(1);
  });
});
