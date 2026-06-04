import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/streamgraph';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

type RiverSeries = { type: string; data: [string, number, string][] };

describe('streamgraph registration', () => {
  it('registers under type "streamgraph" with the time-series family', () => {
    const def = chartRegistry.get('streamgraph');
    expect(def).toBeDefined();
    expect(def!.family).toBe('time-series');
    expect(def!.renderer).toBe('echarts');
  });

  it('declares date, series, and value as its required column roles', () => {
    const def = chartRegistry.get('streamgraph')!;
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'series', 'value']);
  });
});

describe('streamgraph buildOption', () => {
  const def = () => chartRegistry.get('streamgraph')!;

  const timeView = (): DataView => ({
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      ts: ['2026-01-01', '2026-01-01', '2026-01-02', '2026-01-02'],
      grp: ['a', 'b', 'a', 'b'],
      val: [10, 100, 20, 200],
    },
    columns: [
      { name: 'ts', type: 'datetime', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'grp', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'val', type: 'integer', nullable: false, uniqueCount: 4, nullCount: 0 },
    ],
    rowCount: 4,
  });

  const cfg: ChartConfig = {
    chartType: 'streamgraph', columns: { date: 'ts', series: 'grp', value: 'val' }, options: {},
  };

  it('emits a themeRiver series of [date, value, series] triples', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg, theme()) as EChartsOption;
    const series = opt.series as RiverSeries[];
    expect(series[0].type).toBe('themeRiver');
    expect(series[0].data).toEqual([
      ['2026-01-01', 10, 'a'],
      ['2026-01-01', 100, 'b'],
      ['2026-01-02', 20, 'a'],
      ['2026-01-02', 200, 'b'],
    ]);
  });

  it('sets the global palette so themeRiver bands pick up the theme colors', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg, theme()) as EChartsOption;
    expect(opt.color).toEqual(['#f00', '#0f0', '#00f']);
  });

  it('uses a time singleAxis when the date column is temporal', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg, theme()) as EChartsOption;
    expect((opt.singleAxis as { type: string }).type).toBe('time');
    expect((opt.singleAxis as { top: number; bottom: number }).top).toBe(32);
    expect((opt.singleAxis as { top: number; bottom: number }).bottom).toBe(56);
    expect((opt.legend as { bottom: number }).bottom).toBe(8);
    expect((opt.tooltip as { trigger: string }).trigger).toBe('axis');
  });

  it('uses a category singleAxis when the date column is not temporal', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { period: ['Q1', 'Q2'], grp: ['a', 'a'], val: [1, 2] },
      columns: [
        { name: 'period', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'grp', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const config: ChartConfig = { chartType: 'streamgraph', columns: { date: 'period', series: 'grp', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    expect((opt.singleAxis as { type: string }).type).toBe('category');
  });

  it('drops rows whose value is non-finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        ts: ['d1', 'd2', 'd3'],
        grp: ['a', 'a', 'a'],
        val: [10, NaN, 30],
      },
      columns: [
        { name: 'ts', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'grp', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const config: ChartConfig = { chartType: 'streamgraph', columns: { date: 'ts', series: 'grp', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    const series = opt.series as RiverSeries[];
    expect(series[0].data).toEqual([
      ['d1', 10, 'a'],
      ['d3', 30, 'a'],
    ]);
  });

  it('falls back to empty arrays and an empty triple list when columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const config: ChartConfig = { chartType: 'streamgraph', columns: { date: 'nope_d', series: 'nope_s', value: 'nope_v' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    expect((opt.singleAxis as { type: string }).type).toBe('category');
    expect((opt.series as RiverSeries[])[0].data).toEqual([]);
  });

  it('renders the empty state when no row has a finite value', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { ts: ['d1'], grp: ['a'], val: [NaN] },
      columns: [
        { name: 'ts', type: 'date', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'grp', type: 'category', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const config: ChartConfig = { chartType: 'streamgraph', columns: { date: 'ts', series: 'grp', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, config, theme());
    const props = el.props as { message?: string };
    expect(props.message).toBe('No series values to chart');
  });
});
