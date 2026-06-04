import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/multi_line';
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

type LineSeries = { type: string; name: string; data: unknown[]; smooth: boolean; lineStyle: { color: string }; itemStyle: { color: string } };

describe('multi_line registration', () => {
  it('registers under type "multi_line" with the time-series family', () => {
    const def = chartRegistry.get('multi_line');
    expect(def).toBeDefined();
    expect(def!.family).toBe('time-series');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('multi_line buildOption', () => {
  const def = () => chartRegistry.get('multi_line')!;

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

  const cfg = (options: Record<string, unknown> = {}): ChartConfig => ({
    chartType: 'multi_line', columns: { date: 'ts', series: 'grp', value: 'val' }, options,
  });

  it('pivots long-form rows into one line series per distinct series key', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg(), theme()) as EChartsOption;
    const series = opt.series as LineSeries[];
    expect(series).toHaveLength(2);
    expect(series.map((s) => s.name)).toEqual(['a', 'b']);
    expect(series.every((s) => s.type === 'line')).toBe(true);
    expect(series[0].data).toEqual([['2026-01-01', 10], ['2026-01-02', 20]]);
    expect(series[1].data).toEqual([['2026-01-01', 100], ['2026-01-02', 200]]);
  });

  it('colors each series by its index from the palette', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg(), theme()) as EChartsOption;
    const series = opt.series as LineSeries[];
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[1].lineStyle.color).toBe('#0f0');
  });

  it('uses a time axis when the date column is datetime', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg(), theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('time');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
    expect((opt.legend as { bottom: number }).bottom).toBe(8);
    expect((opt.grid as { bottom: number }).bottom).toBe(72);
  });

  it('uses a category axis when the date column is not temporal', () => {
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
    const config: ChartConfig = { chartType: 'multi_line', columns: { date: 'period', series: 'grp', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    expect((opt.xAxis as Record<string, unknown>).type).toBe('category');
  });

  it('defaults the smooth option to false', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg(), theme()) as EChartsOption;
    expect((opt.series as LineSeries[])[0].smooth).toBe(false);
  });

  it('reflects the smooth option when enabled', () => {
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(timeView(), cfg({ smooth: true }), theme()) as EChartsOption;
    expect((opt.series as LineSeries[]).every((s) => s.smooth === true)).toBe(true);
  });

  it('falls back to empty arrays and produces no series when columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const config: ChartConfig = { chartType: 'multi_line', columns: { date: 'nope_d', series: 'nope_s', value: 'nope_v' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, config, theme()) as EChartsOption;
    expect(opt.series as LineSeries[]).toEqual([]);
  });
});
