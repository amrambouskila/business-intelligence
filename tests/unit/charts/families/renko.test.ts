import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/renko';
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

function view(closes: unknown[] = [100, 102, 104]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['d1', 'd2', 'd3'], close: closes },
    columns: [
      { name: 'date', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'close', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

const config: ChartConfig = { chartType: 'renko', columns: { date: 'date', close: 'close' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('renko')!.createRenderer() as EChartsBaseRenderer;
}

describe('renko', () => {
  it('registers in the finance family with date and close roles', () => {
    const def = chartRegistry.get('renko')!;
    expect(def.family).toBe('finance');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'close']);
  });

  it('converts finite close prices into candlestick bricks', () => {
    const opt = renderer().buildOption(view(), config, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['1', '2']);
    const series = (opt.series as Array<{ type: string; data: number[][]; itemStyle: Record<string, string> }>)[0];
    expect(series.type).toBe('candlestick');
    expect(series.data).toEqual([
      [100, 102, 100, 102],
      [102, 104, 102, 104],
    ]);
    expect(series.itemStyle.color).toBe('#00f');
    expect(series.itemStyle.color0).toBe('#0f0');
  });

  it('drops non-finite closes before building bricks', () => {
    const opt = renderer().buildOption(view([100, NaN, 102, 104]), config, theme()) as EChartsOption;
    const series = (opt.series as Array<{ data: number[][] }>)[0];
    expect(series.data).toEqual([
      [100, 102, 100, 102],
    ]);
  });

  it('falls back to a one-point brick size and empty output when prices do not move', () => {
    const opt = renderer().buildOption(view([100, 100]), config, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });

  it('renders an empty state when no Renko bricks can be built', () => {
    const el = chartRegistry.get('renko')!.createRenderer().render(view([100, 100]), config, theme());
    expect((el.props as { message?: string }).message).toBe('No Renko bricks to chart');
  });

  it('falls back to empty arrays when assigned columns are missing', () => {
    const opt = renderer().buildOption(view(), { chartType: 'renko', columns: { date: 'missing_date', close: 'missing_close' }, options: {} }, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
