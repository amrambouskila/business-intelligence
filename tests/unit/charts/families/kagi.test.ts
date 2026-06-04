import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/kagi';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(closes: unknown[] = [100, 102, 104, 101, 98, 99]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'], close: closes },
    columns: [
      { name: 'date', type: 'date', nullable: false, uniqueCount: 6, nullCount: 0 },
      { name: 'close', type: 'float', nullable: true, uniqueCount: 6, nullCount: 0 },
    ],
    rowCount: 6,
  };
}

const config: ChartConfig = { chartType: 'kagi', columns: { date: 'date', close: 'close' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('kagi')!.createRenderer() as EChartsBaseRenderer;
}

describe('kagi', () => {
  it('registers in the finance family with date and close roles', () => {
    const def = chartRegistry.get('kagi')!;
    expect(def.family).toBe('finance');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'close']);
  });

  it('splits close prices into reversal-based line segments', () => {
    const opt = renderer().buildOption(view(), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('value');
    expect((opt.yAxis as { type: string }).type).toBe('value');
    const series = opt.series as Array<{ type: string; data: number[][]; symbol: string; lineStyle: { color: string; width: number } }>;
    expect(series).toHaveLength(3);
    expect(series[0].type).toBe('line');
    expect(series[0].symbol).toBe('none');
    expect(series[0].lineStyle).toEqual({ color: '#00f', width: 2.5 });
    expect(series[0].data).toEqual([[0, 100], [1, 102], [2, 104]]);
    expect(series[1].lineStyle.color).toBe('#0f0');
    expect(series[1].data).toEqual([[2, 104], [3, 101], [4, 98]]);
    expect(series[2].lineStyle.color).toBe('#00f');
    expect(series[2].data).toEqual([[4, 98], [5, 99]]);
  });

  it('keeps a single segment while early moves have not established direction', () => {
    const opt = renderer().buildOption(view([100, 100.001, 100.002]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series).toHaveLength(1);
    expect(series[0].data).toEqual([[0, 100], [1, 100.001], [2, 100.002]]);
  });

  it('establishes an initial downtrend when the first meaningful move is negative', () => {
    const opt = renderer().buildOption(view([100, 98, 96]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][]; lineStyle: { color: string } }>;
    expect(series).toHaveLength(1);
    expect(series[0].lineStyle.color).toBe('#0f0');
    expect(series[0].data).toEqual([[0, 100], [1, 98], [2, 96]]);
  });

  it('does not reverse on a counter move smaller than the reversal amount', () => {
    const opt = renderer().buildOption(view([100, 102, 101.95]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series).toHaveLength(1);
    expect(series[0].data).toEqual([[0, 100], [1, 102]]);
  });

  it('uses the one-point reversal fallback for a single finite close', () => {
    const opt = renderer().buildOption(view([100]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([[0, 100]]);
  });

  it('drops non-finite closes and renders an empty state when none remain', () => {
    const opt = renderer().buildOption(view([100, NaN, 101]), config, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: number[][] }>)[0].data).toEqual([[0, 100], [1, 101]]);

    const el = chartRegistry.get('kagi')!.createRenderer().render(view([NaN]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No close prices to chart');
  });

  it('falls back to no series when assigned columns are missing', () => {
    const opt = renderer().buildOption(view(), { chartType: 'kagi', columns: { date: 'missing_date', close: 'missing_close' }, options: {} }, theme()) as EChartsOption;
    expect(opt.series).toEqual([]);
  });
});
