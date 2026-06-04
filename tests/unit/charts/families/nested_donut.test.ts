import { describe, it, expect } from 'vitest';
import '@/charts/families/composition/nested_donut';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function dataView(columnArrays: Record<string, unknown[]>, rowCount: number): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount };
}

const cfg: ChartConfig = { chartType: 'nested_donut', columns: { level1: 'region', level2: 'quarter', value: 'sales' }, options: {} };
const renderer = () => chartRegistry.get('nested_donut')!.createRenderer() as EChartsBaseRenderer;

type PieSeries = {
  name: string;
  type: string;
  radius: [string, string];
  label: { color: string };
  data: Array<{ name: string; value: number; itemStyle: { color: string } }>;
};

describe('nested_donut registration', () => {
  it('registers as a composition chart with two levels and value', () => {
    const def = chartRegistry.get('nested_donut');
    expect(def).toBeDefined();
    expect(def!.family).toBe('composition');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['level1', 'level2', 'value']);
  });
});

describe('nested_donut buildOption', () => {
  it('aggregates parent and child rings independently', () => {
    const dv = dataView({
      region: ['North', 'North', 'South', 'South'],
      quarter: ['Q1', 'Q1', 'Q1', 'Q2'],
      sales: [10, 5, 20, 7],
    }, 4);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as PieSeries[];

    expect(series.map((s) => s.name)).toEqual(['Level 1', 'Level 2']);
    expect(series[0].radius).toEqual(['0%', '38%']);
    expect(series[1].radius).toEqual(['48%', '72%']);
    expect(series[0].data).toEqual([
      { name: 'North', value: 15, itemStyle: { color: '#f00' } },
      { name: 'South', value: 27, itemStyle: { color: '#0f0' } },
    ]);
    expect(series[1].data).toEqual([
      { name: 'North / Q1', value: 15, itemStyle: { color: '#f00' } },
      { name: 'South / Q1', value: 20, itemStyle: { color: '#0f0' } },
      { name: 'South / Q2', value: 7, itemStyle: { color: '#f00' } },
    ]);
    expect(series[0].label.color).toBe('#fff');
  });

  it('drops non-finite values and falls back to empty arrays for missing columns', () => {
    const opt = renderer().buildOption(dataView({ region: ['North'], quarter: ['Q1'], sales: [Number.NaN] }, 1), cfg, theme()) as EChartsOption;
    const series = opt.series as PieSeries[];
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });

  it('renders empty state when there are no finite slices', () => {
    const el = renderer().render(dataView({}, 0), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No values to chart');
  });
});
