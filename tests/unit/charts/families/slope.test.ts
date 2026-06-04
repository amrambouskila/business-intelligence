import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/slope';
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

describe('slope registration', () => {
  it('registers under type "slope" with the categorical family', () => {
    const def = chartRegistry.get('slope');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('slope buildOption', () => {
  const def = () => chartRegistry.get('slope')!;

  it('builds one two-point line per finite start/end pair', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { label: ['a', 'b', 'c', 'd'], start: [10, 'x', Number.NaN, 40], end: [20, 30, 50, Infinity] },
      columns: [],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'slope', columns: { label: 'label', start_value: 'start', end_value: 'end' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['Start', 'End']);
    const series = opt.series as Array<{ name: string; type: string; data: number[]; symbolSize: number; itemStyle: { color: string }; lineStyle: { color: string } }>;
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({
      name: 'a',
      type: 'line',
      data: [10, 20],
      symbolSize: 8,
      itemStyle: { color: '#f00' },
      lineStyle: { color: '#f00', width: 2 },
    });
  });

  it('renders the empty state when no paired values are finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { label: ['a'], start: [Number.NaN], end: [Infinity] },
      columns: [],
      rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'slope', columns: { label: 'label', start_value: 'start', end_value: 'end' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No paired values to display');
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const cfg: ChartConfig = { chartType: 'slope', columns: { label: 'label', start_value: 'start', end_value: 'end' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect(opt.series).toEqual([]);
  });
});
