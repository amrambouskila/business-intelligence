import { describe, it, expect } from 'vitest';
import '@/charts/families/matrix/quilt_plot';
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

const cfg: ChartConfig = { chartType: 'quilt_plot', columns: { row: 'row', col: 'col', value: 'value' }, options: {} };

const view = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { row: ['r1'], col: ['c1'], value: [7] },
  columns: [
    { name: 'row', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
    { name: 'col', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
    { name: 'value', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
  ],
  rowCount: 1,
});

describe('quilt_plot', () => {
  const renderer = () => chartRegistry.get('quilt_plot')!.createRenderer() as EChartsBaseRenderer;

  it('registers as a matrix chart', () => {
    expect(chartRegistry.get('quilt_plot')!.family).toBe('matrix');
  });

  it('renders bordered labeled heatmap cells', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number, number]>; itemStyle: { borderColor: string }; label: { formatter: (params: { value: [number, number, number] }) => string } }>;
    expect(series[0].data).toEqual([[0, 0, 7]]);
    expect(series[0].itemStyle.borderColor).toBe('#333');
    expect(series[0].label.formatter({ value: [0, 0, 7] })).toBe('7');
  });

  it('renders an empty state when no quilt values exist', () => {
    const empty = view();
    empty.columnArrays.value = [Infinity];
    const el = chartRegistry.get('quilt_plot')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No quilt values to chart');
  });

  it('falls back to empty cells when role columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
