import { describe, expect, it } from 'vitest';
import '@/charts/families/composition/composition_stacked_bar';
import '@/charts/families/composition/composition_percent_stacked_bar';
import '@/charts/families/composition/composition_stacked_area';
import '@/charts/families/composition/composition_percent_stacked_area';
import '@/charts/families/composition/composition_treemap';
import '@/charts/families/composition/composition_sunburst';
import '@/charts/families/composition/composition_waffle';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { EmptyChartState } from '@/charts/renderers/EmptyChartState';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark',
    background: '#000',
    foreground: '#fff',
    gridColor: '#333',
    axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'],
    sequentialScale: ['#000', '#fff'],
    divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial',
    fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(columnArrays: DataView['columnArrays']): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    columnArrays,
    columns: Object.keys(columnArrays).map((name) => ({
      name,
      type: typeof columnArrays[name][0] === 'number' ? 'float' : 'category',
      nullable: false,
      uniqueCount: 3,
      nullCount: 0,
    })),
    rowCount: Math.max(0, ...Object.values(columnArrays).map((column) => column.length)),
  };
}

function option(type: string, data: DataView, columns: ChartConfig['columns']): EChartsOption {
  const def = chartRegistry.get(type)!;
  const config: ChartConfig = { chartType: type, columns, options: {} };
  return (def.createRenderer() as EChartsBaseRenderer).buildOption(data, config, theme()) as EChartsOption;
}

describe('composition completion registrations', () => {
  it('registers the duplicated composition catalog concepts with unique chart types', () => {
    for (const type of [
      'composition_stacked_bar',
      'composition_percent_stacked_bar',
      'composition_stacked_area',
      'composition_percent_stacked_area',
      'composition_treemap',
      'composition_sunburst',
      'composition_waffle',
    ]) {
      const def = chartRegistry.get(type);
      expect(def).toBeDefined();
      expect(def!.family).toBe('composition');
      expect(def!.renderer).toBe('echarts');
    }
  });
});

describe('composition stacked bar variants', () => {
  const data = view({
    category: ['Q1', 'Q1', 'Q2', 'Q2'],
    subgroup: ['A', 'B', 'A', 'B'],
    value: [10, 30, 0, 0],
  });
  const columns = { category: 'category', subgroup: 'subgroup', value: 'value' };

  it('builds absolute stacked bars from category/subgroup/value rows', () => {
    const opt = option('composition_stacked_bar', data, columns);
    expect((opt.legend as { data: string[] }).data).toEqual(['A', 'B']);
    expect((opt.grid as { bottom: number }).bottom).toBe(72);
    const series = opt.series as Array<{ type: string; stack: string; data: number[]; itemStyle: { color: string } }>;
    expect(series.map((s) => s.type)).toEqual(['bar', 'bar']);
    expect(series.every((s) => s.stack === 'composition')).toBe(true);
    expect(series[0].data).toEqual([10, 0]);
    expect(series[1].data).toEqual([30, 0]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('builds percent stacked bars and protects zero-total categories', () => {
    const opt = option('composition_percent_stacked_bar', data, columns);
    expect((opt.yAxis as { min: number; max: number }).max).toBe(100);
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([25, 0]);
    expect(series[1].data).toEqual([75, 0]);
  });

  it('falls back to empty arrays for missing stacked-bar columns', () => {
    const opt = option('composition_stacked_bar', view({}), { category: 'x', subgroup: 'y', value: 'z' });
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect(opt.series).toEqual([]);

    const percent = option('composition_percent_stacked_bar', view({}), { category: 'x', subgroup: 'y', value: 'z' });
    expect((percent.xAxis as { data: string[] }).data).toEqual([]);
    expect(percent.series).toEqual([]);
  });

  it('renders the percent stacked bar empty state for missing values', () => {
    const def = chartRegistry.get('composition_percent_stacked_bar')!;
    const el = (def.createRenderer() as EChartsBaseRenderer).render(
      view({}),
      { chartType: 'composition_percent_stacked_bar', columns: { category: 'x', subgroup: 'y', value: 'z' }, options: {} },
      theme(),
    );
    expect(el.type).toBe(EmptyChartState);
  });

  it('renders the percent stacked bar chart path when data is fillable', () => {
    const def = chartRegistry.get('composition_percent_stacked_bar')!;
    const el = (def.createRenderer() as EChartsBaseRenderer).render(
      data,
      { chartType: 'composition_percent_stacked_bar', columns, options: {} },
      theme(),
    );
    expect(el.type).not.toBe(EmptyChartState);
  });
});

describe('composition stacked area variants', () => {
  const data = view({
    date: ['2024-01', '2024-01', '2024-02', '2024-02'],
    subgroup: ['A', 'B', 'A', 'B'],
    value: [10, 30, 0, 0],
  });
  const columns = { date: 'date', subgroup: 'subgroup', value: 'value' };

  it('builds absolute stacked areas from date/subgroup/value rows', () => {
    const opt = option('composition_stacked_area', data, columns);
    const series = opt.series as Array<{ type: string; stack: string; data: number[]; areaStyle: object; symbol: string }>;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01', '2024-02']);
    expect(series.map((s) => s.type)).toEqual(['line', 'line']);
    expect(series.every((s) => s.stack === 'composition')).toBe(true);
    expect(series[0].data).toEqual([10, 0]);
    expect(series[1].data).toEqual([30, 0]);
    expect(series[0].symbol).toBe('none');
  });

  it('builds percent stacked areas and protects zero-total time buckets', () => {
    const opt = option('composition_percent_stacked_area', data, columns);
    expect((opt.yAxis as { min: number; max: number }).max).toBe(100);
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([25, 0]);
    expect(series[1].data).toEqual([75, 0]);
  });

  it('falls back to empty arrays for missing stacked-area columns', () => {
    const opt = option('composition_stacked_area', view({}), { date: 'x', subgroup: 'y', value: 'z' });
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect(opt.series).toEqual([]);

    const percent = option('composition_percent_stacked_area', view({}), { date: 'x', subgroup: 'y', value: 'z' });
    expect((percent.xAxis as { data: string[] }).data).toEqual([]);
    expect(percent.series).toEqual([]);
  });

  it('renders the percent stacked area empty state for missing values', () => {
    const def = chartRegistry.get('composition_percent_stacked_area')!;
    const el = (def.createRenderer() as EChartsBaseRenderer).render(
      view({}),
      { chartType: 'composition_percent_stacked_area', columns: { date: 'x', subgroup: 'y', value: 'z' }, options: {} },
      theme(),
    );
    expect(el.type).toBe(EmptyChartState);
  });
});

describe('composition hierarchy variants', () => {
  const data = view({
    id: ['Root', 'A', 'B'],
    parent: ['', 'Root', 'Root'],
    value: [30, 10, 20],
  });
  const columns = { id: 'id', parent: 'parent', value: 'value' };

  it('builds a composition treemap from hierarchy rows', () => {
    const opt = option('composition_treemap', data, columns);
    const series = opt.series as Array<{ type: string; data: Array<{ name: string; children: unknown[] }> }>;
    expect(series[0].type).toBe('treemap');
    expect(series[0].data[0].name).toBe('Root');
    expect(series[0].data[0].children).toHaveLength(2);
  });

  it('builds a composition sunburst from hierarchy rows', () => {
    const opt = option('composition_sunburst', data, columns);
    const series = opt.series as Array<{ type: string; radius: string[]; data: Array<{ name: string }> }>;
    expect(series[0].type).toBe('sunburst');
    expect(series[0].radius).toEqual(['8%', '86%']);
    expect(series[0].data[0].name).toBe('Root');
  });

  it('renders empty states for missing hierarchy columns', () => {
    for (const type of ['composition_treemap', 'composition_sunburst']) {
      const def = chartRegistry.get(type)!;
      const el = (def.createRenderer() as EChartsBaseRenderer).render(
        view({}),
        { chartType: type, columns: { id: 'x', parent: 'y', value: 'z' }, options: {} },
        theme(),
      );
      expect(el.type).toBe(EmptyChartState);
    }
  });
});

describe('composition waffle', () => {
  it('builds a 100-cell part-to-whole grid from positive category values', () => {
    const opt = option('composition_waffle', view({
      category: ['A', 'B', 'C'],
      value: [25, 50, 25],
    }), { category: 'category', value: 'value' });
    const series = opt.series as Array<{ type: string; data: number[][]; itemStyle: { color: string } }>;
    expect(series.map((s) => s.type)).toEqual(['scatter', 'scatter', 'scatter']);
    expect(series.reduce((sum, s) => sum + s.data.length, 0)).toBe(100);
    expect(series.map((s) => s.data.length)).toEqual([25, 50, 25]);
    expect(series[1].itemStyle.color).toBe('#0f0');
  });

  it('uses the final slice to absorb rounding and reports empty non-positive data', () => {
    const rounded = option('composition_waffle', view({
      category: ['A', 'B', 'C'],
      value: [1, 1, 1],
    }), { category: 'category', value: 'value' });
    const roundedSeries = rounded.series as Array<{ data: number[][] }>;
    expect(roundedSeries.map((s) => s.data.length)).toEqual([33, 33, 34]);

    const def = chartRegistry.get('composition_waffle')!;
    const el = (def.createRenderer() as EChartsBaseRenderer).render(
      view({ category: ['A', 'B'], value: [0, -2] }),
      { chartType: 'composition_waffle', columns: { category: 'category', value: 'value' }, options: {} },
      theme(),
    );
    expect(el.type).toBe(EmptyChartState);
  });

  it('falls back to empty arrays for missing waffle columns', () => {
    const opt = option('composition_waffle', view({}), { category: 'x', value: 'y' });
    expect(opt.series).toEqual([]);
  });
});
