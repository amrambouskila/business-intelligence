import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/ohlc';
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

const cfg: ChartConfig = {
  chartType: 'ohlc',
  columns: { date: 'date', open: 'open', high: 'high', low: 'low', close: 'close' },
  options: {},
};

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('ohlc')!.createRenderer() as EChartsBaseRenderer;
}

describe('ohlc registration', () => {
  it('registers under type "ohlc" with the finance family and OHLC roles', () => {
    const def = chartRegistry.get('ohlc');
    expect(def).toBeDefined();
    expect(def!.family).toBe('finance');
    expect(def!.renderer).toBe('echarts');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['date', 'open', 'high', 'low', 'close']);
  });
});

describe('ohlc buildOption', () => {
  it('emits a custom series with [index, o, h, l, c] data on a category date axis', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        date: ['2024-01-01', '2024-01-02'],
        open: [10, 17],
        high: [15, 18],
        low: [8, 11],
        close: [12, 13],
      },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'open', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'high', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01', '2024-01-02']);
    expect((opt.yAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    const series = opt.series as Array<{ type: string; data: number[][]; encode: { x: number; y: number[] }; renderItem: unknown }>;
    expect(series[0].type).toBe('custom');
    expect(series[0].encode).toEqual({ x: 0, y: [1, 2, 3, 4] });
    expect(series[0].data).toEqual([
      [0, 10, 15, 8, 12],
      [1, 17, 18, 11, 13],
    ]);

    const tooltip = opt.tooltip as { trigger: string; axisPointer: { type: string } };
    expect(tooltip.trigger).toBe('axis');
    expect(tooltip.axisPointer.type).toBe('cross');

    const dataZoom = opt.dataZoom as Array<{ type: string; xAxisIndex: number }>;
    expect(dataZoom[0]).toEqual({ type: 'inside', xAxisIndex: 0 });
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const missing: ChartConfig = {
      chartType: 'ohlc',
      columns: { date: 'nope_d', open: 'nope_o', high: 'nope_h', low: 'nope_l', close: 'nope_c' },
      options: {},
    };
    const opt = renderer().buildOption(dv, missing, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  it('drops rows with any non-finite OHLC value and reindexes the kept rows', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        date: ['d1', 'd2', 'd3'],
        open: [10, 11, 12],
        high: [15, Infinity, 18],
        low: [8, 9, 11],
        close: [12, 13, 17],
      },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'open', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'high', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['d1', 'd3']);
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data).toEqual([
      [0, 10, 15, 8, 12],
      [1, 12, 18, 11, 17],
    ]);
  });

  it('renders the empty state when no row has finite OHLC', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { date: ['d1'], open: [NaN], high: [1], low: [1], close: [1] },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'open', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
        { name: 'high', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const el = renderer().render(dv, cfg, theme());
    const props = el.props as { message?: string };
    expect(props.message).toBe('No OHLC rows to chart');
  });
});

describe('ohlc renderItem', () => {
  function buildItem() {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { date: ['d1', 'd2'], open: [10, 20], high: [15, 22], low: [8, 18], close: [12, 19] },
      columns: [
        { name: 'date', type: 'date', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'open', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'high', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'low', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'close', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ renderItem: (p: unknown, api: unknown) => { type: string; children: Array<{ type: string; shape: Record<string, number>; style: { stroke: string } }> } }>;
    return series[0].renderItem;
  }

  // Minimal api stub: value(i) reads the active datum; coord maps to predictable pixels; size returns a band width.
  function makeApi(datum: number[], size: (() => number | number[]) | undefined = () => [40, 0]) {
    return {
      value: (i: number) => datum[i],
      coord: ([cat, val]: [number, number]) => [cat * 100, 1000 - val],
      size,
    };
  }

  it('draws the low->high line plus open (left) and close (right) ticks, green when close>=open', () => {
    const render = buildItem();
    // datum: [index=1, open=20, high=22, low=18, close=19]
    const group = render({}, makeApi([1, 20, 22, 18, 19]));
    expect(group.type).toBe('group');
    const [wick, openTick, closeTick] = group.children;

    expect(wick.type).toBe('line');
    expect(wick.shape).toEqual({ x1: 100, y1: 1000 - 18, x2: 100, y2: 1000 - 22 });
    expect(openTick.shape).toEqual({ x1: 100 - 20, y1: 1000 - 20, x2: 100, y2: 1000 - 20 });
    expect(closeTick.shape).toEqual({ x1: 100, y1: 1000 - 19, x2: 100 + 20, y2: 1000 - 19 });

    // close(19) < open(20) -> down color = colorScale[1] = '#0f0'
    expect(wick.style.stroke).toBe('#0f0');
  });

  it('uses the up color (colorScale[2]) when close>=open', () => {
    const render = buildItem();
    // datum: [index=0, open=10, high=15, low=8, close=12]  (close>=open -> up)
    const group = render({}, makeApi([0, 10, 15, 8, 12]));
    expect(group.children[0].style.stroke).toBe('#00f');
  });

  it('handles a numeric api.size return (no array indexing)', () => {
    const render = buildItem();
    // size returns a bare number 40 -> tick = 20; ticks sit ±20 around x.
    const group = render({}, makeApi([1, 20, 22, 18, 19], () => 40));
    expect(group.children[1].shape.x1).toBe(100 - 20);
    expect(group.children[2].shape.x2).toBe(100 + 20);
  });

  it('falls back to a zero-width tick when api.size is unavailable', () => {
    const render = buildItem();
    // api with no size fn at all -> band [0,0] -> tick 0 -> ticks collapse onto x.
    const api = {
      value: (i: number) => [1, 20, 22, 18, 19][i],
      coord: ([cat, val]: [number, number]) => [cat * 100, 1000 - val],
    };
    const group = render({}, api);
    expect(group.children[1].shape.x1).toBe(100);
    expect(group.children[2].shape.x2).toBe(100);
  });
});
