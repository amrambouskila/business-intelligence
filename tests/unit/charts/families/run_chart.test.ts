import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/run_chart';
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

const cfg: ChartConfig = { chartType: 'run_chart', columns: { date: 'date', value: 'value' }, options: {} };

const view = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: { date: ['d1', 'd2', 'd3'], value: [10, NaN, 20] },
  columns: [
    { name: 'date', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
    { name: 'value', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
  ],
  rowCount: 3,
});

describe('run_chart', () => {
  const renderer = () => chartRegistry.get('run_chart')!.createRenderer() as EChartsBaseRenderer;

  it('registers as a time-series ECharts chart', () => {
    const def = chartRegistry.get('run_chart')!;
    expect(def.family).toBe('time-series');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'value']);
  });

  it('renders finite points with a mean mark line', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('category');
    const series = opt.series as Array<{ data: unknown[]; markLine: { data: Array<{ yAxis: number; name: string }> }; itemStyle: { color: string } }>;
    expect(series[0].data).toEqual([['d1', 10], ['d3', 20]]);
    expect(series[0].markLine.data).toEqual([{ yAxis: 15, name: 'Mean' }]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('uses a time axis when the date column is temporal', () => {
    const dv = view();
    dv.columns[0] = { name: 'date', type: 'datetime', nullable: false, uniqueCount: 3, nullCount: 0 };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
  });

  it('falls back to an empty point list when referenced columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });

  it('renders an empty state when there are no finite values', () => {
    const empty = view();
    empty.columnArrays.value = [NaN];
    const el = chartRegistry.get('run_chart')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No run values to chart');
  });
});
