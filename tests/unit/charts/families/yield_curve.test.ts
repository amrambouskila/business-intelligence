import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/yield_curve';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'yield_curve', columns: { maturity: 'maturity', yield: 'yield' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 4,
    columnArrays: { maturity: ['10Y', '2Y', 'bad', 1], yield: [4.1, 3.8, 9, Number.NaN] },
    columns: [],
  };
}

describe('yield_curve', () => {
  it('registers maturity and yield roles', () => {
    expect(chartRegistry.get('yield_curve')!.requiredColumns.map((role) => role.role)).toEqual(['maturity', 'yield']);
  });

  it('parses maturity labels, drops invalid pairs, and sorts by maturity', () => {
    const opt = (chartRegistry.get('yield_curve')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([[2, 3.8], [10, 4.1]]);
    expect(((opt.yAxis as { axisLabel: { formatter: string } }).axisLabel).formatter).toBe('{value}%');
  });

  it('accepts numeric maturity values directly', () => {
    const dv: DataView = { ...view(), columnArrays: { maturity: [5, 1], yield: [4.2, 3.7] }, rowCount: 2 };
    const opt = (chartRegistry.get('yield_curve')!.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([[1, 3.7], [5, 4.2]]);
  });

  it('renders an empty state when no values are plottable', () => {
    const dv: DataView = { ...view(), columnArrays: { maturity: ['x'], yield: [NaN] }, rowCount: 1 };
    const el = chartRegistry.get('yield_curve')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No yield curve values to chart');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = { chartType: 'yield_curve', columns: { maturity: 'missing_maturity', yield: 'missing_yield' }, options: {} };
    const el = chartRegistry.get('yield_curve')!.createRenderer().render(view(), missing, theme());
    expect((el.props as { message: string }).message).toBe('No yield curve values to chart');
  });
});
