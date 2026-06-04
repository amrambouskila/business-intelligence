import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/bubble';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

type BubblePoint = [number, number, number];
type BubbleSeries = { type: string; data: BubblePoint[]; symbolSize: (val: BubblePoint) => number; itemStyle: { color: string; opacity: number } };

describe('bubble registration', () => {
  it('registers under type "bubble" with the relationships family', () => {
    const def = chartRegistry.get('bubble');
    expect(def).toBeDefined();
    expect(def!.family).toBe('relationships');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('bubble buildOption', () => {
  const def = () => chartRegistry.get('bubble')!;

  const xyzView = (): DataView => ({
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { x: [1, 2, 3], y: [4, 5, 6], size: [10, 20, 30] },
    columns: [
      { name: 'x', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'y', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      { name: 'size', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'nope_x', y: 'nope_y', size: 'nope_size' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  it('builds a scatter series of [x, y, size] points', () => {
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'x', y: 'y', size: 'size' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(xyzView(), cfg, theme()) as EChartsOption;
    const s = (opt.series as BubbleSeries[])[0];
    expect(s.type).toBe('scatter');
    expect(s.data).toEqual([[1, 4, 10], [2, 5, 20], [3, 6, 30]]);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();
  });

  it('colors from the palette and defaults opacity to 0.7', () => {
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'x', y: 'y', size: 'size' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(xyzView(), cfg, theme()) as EChartsOption;
    const s = (opt.series as BubbleSeries[])[0];
    expect(s.itemStyle.color).toBe('#f00');
    expect(s.itemStyle.opacity).toBe(0.7);
  });

  it('reflects the opacity option', () => {
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'x', y: 'y', size: 'size' }, options: { opacity: 0.3 } };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(xyzView(), cfg, theme()) as EChartsOption;
    expect((opt.series as BubbleSeries[])[0].itemStyle.opacity).toBe(0.3);
  });

  it('scales symbolSize linearly between min and max radius across the size range', () => {
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'x', y: 'y', size: 'size' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(xyzView(), cfg, theme()) as EChartsOption;
    const sizeOf = (opt.series as BubbleSeries[])[0].symbolSize;
    // size data [10, 20, 30] -> normalized to [6, 23, 40] with defaults min=6, max=40.
    expect(sizeOf([1, 4, 10])).toBeCloseTo(6);
    expect(sizeOf([2, 5, 20])).toBeCloseTo(23);
    expect(sizeOf([3, 6, 30])).toBeCloseTo(40);
  });

  it('honors custom minRadius and maxRadius options', () => {
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'x', y: 'y', size: 'size' }, options: { minRadius: 10, maxRadius: 50 } };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(xyzView(), cfg, theme()) as EChartsOption;
    const sizeOf = (opt.series as BubbleSeries[])[0].symbolSize;
    expect(sizeOf([1, 4, 10])).toBeCloseTo(10);
    expect(sizeOf([3, 6, 30])).toBeCloseTo(50);
  });

  it('computes the size range regardless of value order', () => {
    const dv: DataView = { ...xyzView(), columnArrays: { x: [1, 2, 3], y: [4, 5, 6], size: [30, 10, 20] } };
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'x', y: 'y', size: 'size' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const sizeOf = (opt.series as BubbleSeries[])[0].symbolSize;
    expect(sizeOf([1, 4, 30])).toBeCloseTo(40); // max size -> maxRadius
    expect(sizeOf([2, 5, 10])).toBeCloseTo(6); // min size -> minRadius
  });

  it('falls back to minRadius when every size value is equal (zero range)', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { x: [1, 2], y: [3, 4], size: [5, 5] },
      columns: [
        { name: 'x', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'y', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'size', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'bubble', columns: { x: 'x', y: 'y', size: 'size' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const sizeOf = (opt.series as BubbleSeries[])[0].symbolSize;
    expect(sizeOf([1, 3, 5])).toBe(6);
    expect(sizeOf([2, 4, 5])).toBe(6);
  });
});
