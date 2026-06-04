import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/waterfall_chart';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#0f0', '#f00', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function dataView(columnArrays: Record<string, unknown[]>, rowCount: number): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount };
}

const cfg: ChartConfig = { chartType: 'waterfall_chart', columns: { step: 'step', delta: 'delta' }, options: {} };
const renderer = () => chartRegistry.get('waterfall_chart')!.createRenderer() as EChartsBaseRenderer;

type WaterfallSeries = Array<{
  name: string;
  type: string;
  stack?: string;
  data: unknown[];
  itemStyle?: { color: string };
  lineStyle?: { color: string; width: number };
}>;

describe('waterfall_chart registration', () => {
  it('registers step and delta roles', () => {
    const def = chartRegistry.get('waterfall_chart');
    expect(def).toBeDefined();
    expect(def!.family).toBe('network-flow');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['step', 'delta']);
  });
});

describe('waterfall_chart buildOption', () => {
  it('builds transparent base, positive/negative delta bars, and running total line', () => {
    const dv = dataView({ step: ['Start', 'Cost', 'Gain'], delta: [10, -4, 6] }, 3);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as WaterfallSeries;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['Start', 'Cost', 'Gain']);
    expect(series.map((s) => s.name)).toEqual(['Base', 'Delta', 'Running total']);
    expect(series[0].data).toEqual([0, 6, 6]);
    expect(series[1].data).toEqual([
      { value: 10, itemStyle: { color: '#0f0' } },
      { value: 4, itemStyle: { color: '#f00' } },
      { value: 6, itemStyle: { color: '#0f0' } },
    ]);
    expect(series[2].data).toEqual([10, 6, 12]);
    expect(series[2].lineStyle).toEqual({ color: '#00f', width: 2 });
  });

  it('drops non-finite deltas', () => {
    const opt = renderer().buildOption(dataView({ step: ['a', 'b'], delta: [1, Number.NaN] }, 2), cfg, theme()) as EChartsOption;
    const series = opt.series as WaterfallSeries;
    expect(series[0].data).toEqual([0]);
    expect(series[2].data).toEqual([1]);
  });

  it('renders empty state when no deltas exist', () => {
    const el = renderer().render(dataView({}, 0), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No deltas to chart');
  });
});
