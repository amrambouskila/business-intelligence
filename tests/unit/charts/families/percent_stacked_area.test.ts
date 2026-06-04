import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/percent_stacked_area';
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

const cfg: ChartConfig = {
  chartType: 'percent_stacked_area',
  columns: { date: 'date', series: 'series', value: 'value' },
  options: {},
};

const view = (): DataView => ({
  sourceId: 'x', rows: [], filters: [],
  columnArrays: {
    date: ['Jan', 'Jan', 'Feb', 'Feb', 'Mar', 'Mar'],
    series: ['A', 'B', 'A', 'B', 'A', 'B'],
    value: [30, 10, 20, 20, 0, 0],
  },
  columns: [
    { name: 'date', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
    { name: 'series', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
    { name: 'value', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
  ],
  rowCount: 6,
});

describe('percent_stacked_area', () => {
  const renderer = () => chartRegistry.get('percent_stacked_area')!.createRenderer() as EChartsBaseRenderer;

  it('registers as a time-series ECharts chart', () => {
    const def = chartRegistry.get('percent_stacked_area');
    expect(def).toBeDefined();
    expect(def!.family).toBe('time-series');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['date', 'series', 'value']);
  });

  it('normalizes each date bucket to percentages and keeps zero-total buckets at zero', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['Jan', 'Feb', 'Mar']);
    expect((opt.yAxis as { min: number; max: number; name: string }).max).toBe(100);
    expect((opt.yAxis as { name: string }).name).toBe('%');
    expect((opt.grid as { bottom: number }).bottom).toBe(72);
    const series = opt.series as Array<{ name: string; type: string; stack: string; data: number[]; lineStyle: { color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['A', 'B']);
    expect(series.every((s) => s.type === 'line' && s.stack === 'total')).toBe(true);
    expect(series[0].data).toEqual([75, 50, 0]);
    expect(series[1].data).toEqual([25, 50, 0]);
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[1].lineStyle.color).toBe('#0f0');
  });

  it('drops non-finite values before normalizing', () => {
    const dv = view();
    dv.columnArrays.value = [Number.NaN, 25, 75];
    dv.columnArrays.date = ['Q1', 'Q1', 'Q1'];
    dv.columnArrays.series = ['A', 'B', 'A'];
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data[0]).toBeCloseTo(75);
    expect(series[1].data[0]).toBeCloseTo(25);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const opt = renderer().buildOption({ sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 }, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect(opt.series as unknown[]).toEqual([]);
  });

  it('renders an empty state when no groups or keys are present', () => {
    const el = chartRegistry.get('percent_stacked_area')!.createRenderer().render(
      { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 },
      cfg,
      theme(),
    );
    expect((el.props as { message?: string }).message).toBe('No series values to chart');
  });
});
