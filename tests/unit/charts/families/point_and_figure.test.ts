import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/point_and_figure';
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

function view(closes: unknown[] = [100, 104, 108, 96, 92]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['d1', 'd2', 'd3', 'd4', 'd5'], close: closes },
    columns: [
      { name: 'date', type: 'date', nullable: false, uniqueCount: 5, nullCount: 0 },
      { name: 'close', type: 'float', nullable: true, uniqueCount: 5, nullCount: 0 },
    ],
    rowCount: 5,
  };
}

const config: ChartConfig = { chartType: 'point_and_figure', columns: { date: 'date', close: 'close' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('point_and_figure')!.createRenderer() as EChartsBaseRenderer;
}

describe('point_and_figure', () => {
  it('registers in the finance family with date and close roles', () => {
    const def = chartRegistry.get('point_and_figure')!;
    expect(def.family).toBe('finance');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'close']);
  });

  it('converts close prices into rising X and falling O scatter boxes', () => {
    const opt = renderer().buildOption(view(), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('value');
    expect((opt.yAxis as { type: string }).type).toBe('value');

    const series = opt.series as Array<{
      type: string;
      name: string;
      data: Array<[number, number, string]>;
      symbolSize: number;
      itemStyle: { color: string };
      label: { show: boolean; color: string; formatter: (params: { data?: unknown }) => string };
    }>;
    expect(series[0].type).toBe('scatter');
    expect(series[0].name).toBe('Rising');
    expect(series[0].symbolSize).toBe(22);
    expect(series[0].itemStyle.color).toBe('#00f');
    expect(series[0].data).toHaveLength(12);
    expect(series[0].data[0]).toEqual([0, 151, 'X']);
    expect(series[0].data.at(-1)).toEqual([0, 162, 'X']);

    expect(series[1].name).toBe('Falling');
    expect(series[1].itemStyle.color).toBe('#0f0');
    expect(series[1].data).toHaveLength(24);
    expect(series[1].data[0]).toEqual([1, 161, 'O']);
    expect(series[1].data.at(-1)).toEqual([1, 138, 'O']);
    expect(series[0].label.show).toBe(true);
    expect(series[0].label.color).toBe('#000');
    expect(series[0].label.formatter({ data: [0, 1, 'X'] })).toBe('X');
    expect(series[0].label.formatter({ data: [0, 1, 2] })).toBe('');
    expect(series[0].label.formatter({ data: undefined })).toBe('');
  });

  it('drops non-finite closes before building boxes', () => {
    const opt = renderer().buildOption(view([100, NaN, 104]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number, string]> }>;
    expect(series[0].data).toHaveLength(24);
    expect(series[0].data[0]).toEqual([0, 601, 'X']);
    expect(series[0].data.at(-1)).toEqual([0, 624, 'X']);
    expect(series[1].data).toEqual([]);
  });

  it('builds a falling O column when the initial move is negative', () => {
    const opt = renderer().buildOption(view([100, 96, 92]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number, string]> }>;
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toHaveLength(24);
    expect(series[1].data[0]).toEqual([0, 299, 'O']);
    expect(series[1].data.at(-1)).toEqual([0, 276, 'O']);
  });

  it('reverses from a falling O column into a rising X column', () => {
    const opt = renderer().buildOption(view([100, 96, 92, 104]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number, string]> }>;
    expect(series[0].data[0]).toEqual([1, 185, 'X']);
    expect(series[0].data.at(-1)).toEqual([1, 208, 'X']);
    expect(series[1].data[0]).toEqual([0, 199, 'O']);
    expect(series[1].data.at(-1)).toEqual([0, 184, 'O']);
  });

  it('ignores a counter move smaller than the three-box reversal threshold', () => {
    const opt = renderer().buildOption(view([100, 104, 103.7]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<[number, number, string]> }>;
    expect(series[0].data).toHaveLength(24);
    expect(series[1].data).toEqual([]);
  });

  it('uses the one-point box-size fallback for a single finite close', () => {
    const opt = renderer().buildOption(view([100]), config, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });

  it('renders an empty state when no price box can be built', () => {
    const el = chartRegistry.get('point_and_figure')!.createRenderer().render(view([100, 100]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No point-and-figure boxes to chart');
  });

  it('falls back to no boxes when assigned columns are missing', () => {
    const opt = renderer().buildOption(view(), { chartType: 'point_and_figure', columns: { date: 'missing_date', close: 'missing_close' }, options: {} }, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
    expect(series[1].data).toEqual([]);
  });
});
