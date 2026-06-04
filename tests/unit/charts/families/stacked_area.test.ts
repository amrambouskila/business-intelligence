import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/stacked_area';
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

describe('stacked_area registration', () => {
  it('registers under type "stacked_area" with the time-series family', () => {
    const def = chartRegistry.get('stacked_area');
    expect(def).toBeDefined();
    expect(def!.family).toBe('time-series');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('stacked_area buildOption', () => {
  const def = () => chartRegistry.get('stacked_area')!;
  type StackedSeries = {
    name: string;
    type: string;
    stack: string;
    areaStyle: Record<string, unknown>;
    data: (number | null)[];
    lineStyle: { color: string };
  };

  const longView = (): DataView => ({
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['2026-01', '2026-01', '2026-02', '2026-02', '2026-03'],
      series: ['a', 'b', 'a', 'b', 'a'],
      value: [1, 10, 2, 20, 3],
    },
    columns: [
      { name: 'date', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'series', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 5, nullCount: 0 },
    ],
    rowCount: 5,
  });

  it('pivots long-form rows into one aligned stacked line series per series value', () => {
    const cfg: ChartConfig = { chartType: 'stacked_area', columns: { x: 'date', series: 'series', y: 'value' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(longView(), cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2026-01', '2026-02', '2026-03']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    const series = opt.series as StackedSeries[];
    expect(series).toHaveLength(2);
    expect(series.map((s) => s.name)).toEqual(['a', 'b']);
    expect(series.every((s) => s.type === 'line' && s.stack === 'total')).toBe(true);
    expect(series.every((s) => s.areaStyle != null)).toBe(true);
    // Series "a" has a value at every date; series "b" is missing 2026-03 ->
    // 0 (not null) so the stacked baseline stays continuous.
    expect(series[0].data).toEqual([1, 2, 3]);
    expect(series[1].data).toEqual([10, 20, 0]);
  });

  it('colors series by palette index, cycling the palette', () => {
    const cfg: ChartConfig = { chartType: 'stacked_area', columns: { x: 'date', series: 'series', y: 'value' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(longView(), cfg, theme()) as EChartsOption;
    const series = opt.series as StackedSeries[];
    expect(series[0].lineStyle.color).toBe('#f00');
    expect(series[1].lineStyle.color).toBe('#0f0');
    expect((opt.legend as { data: string[]; bottom: number }).data).toEqual(['a', 'b']);
    expect((opt.legend as { bottom: number }).bottom).toBe(8);
    expect((opt.grid as { bottom: number }).bottom).toBe(72);
  });

  it('falls back to empty column arrays and an empty series list when references are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'stacked_area', columns: { x: 'missing', series: 'gone', y: 'absent' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    expect(opt.series as unknown[]).toEqual([]);
  });
});
