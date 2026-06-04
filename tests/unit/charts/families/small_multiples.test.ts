import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/small_multiples';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#999',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(values: unknown[] = [10, 5, 2, 7, 'bad']): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    columnArrays: {
      facet: ['North', 'North', 'South', 'South', 'South'],
      category: ['Q1', 'Q1', 'Q1', 'Q2', 'Q2'],
      value: values,
    },
    columns: [],
    rowCount: values.length,
  };
}

const cfg: ChartConfig = {
  chartType: 'small_multiples',
  columns: { facet: 'facet', category: 'category', value: 'value' },
  options: {},
};

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('small_multiples')!.createRenderer() as EChartsBaseRenderer;
}

describe('small_multiples', () => {
  it('registers facet, category, and value roles', () => {
    const def = chartRegistry.get('small_multiples')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((role) => role.role)).toEqual(['facet', 'category', 'value']);
  });

  it('aggregates duplicate facet/category values into mini bar grids', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const xAxis = opt.xAxis as Array<{ name: string; data: string[] }>;
    const series = opt.series as Array<{ name: string; data: number[]; itemStyle: { color: string } }>;
    expect(xAxis.map((axis) => axis.name)).toEqual(['North', 'South']);
    expect(xAxis[0].data).toEqual(['Q1', 'Q2']);
    expect(series).toHaveLength(2);
    expect(series[0].data).toEqual([15, 0]);
    expect(series[1].data).toEqual([2, 7]);
    expect(series[1].itemStyle.color).toBe('#0f0');
  });

  it('shows an empty state when no finite values exist', () => {
    const el = renderer().render(view([NaN, Infinity, 'bad']), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No faceted values to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No faceted values to chart');
  });

  it('drops rows with missing facet or category values', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: {
        facet: [null, 'North', 'South'],
        category: ['Q1', null, 'Q2'],
        value: [10, 20, 30],
      },
      rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[] }>;
    expect(series).toHaveLength(1);
    expect(series[0].name).toBe('South');
    expect(series[0].data).toEqual([30]);
  });
});
