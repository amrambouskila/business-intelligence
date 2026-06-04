import { describe, it, expect } from 'vitest';
import '@/charts/families/finance/volume';
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

describe('volume registration', () => {
  it('registers under type "volume" with the finance family', () => {
    const def = chartRegistry.get('volume');
    expect(def).toBeDefined();
    expect(def!.family).toBe('finance');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('volume buildOption', () => {
  const def = () => chartRegistry.get('volume')!;

  it('builds a category date x-axis and a bar series of volume values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { day: ['2024-01-01', '2024-01-02', '2024-01-03'], vol: [1000, 2500, 1800] },
      columns: [
        { name: 'day', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'vol', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'volume', columns: { date: 'day', volume: 'vol' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as Record<string, unknown>).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect((opt.yAxis as Record<string, unknown>).axisLine).toBeUndefined();

    const series = opt.series as Array<{ type: string; data: number[]; itemStyle: { color: string } }>;
    expect(series).toHaveLength(1);
    expect(series[0].type).toBe('bar');
    expect(series[0].data).toEqual([1000, 2500, 1800]);
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('stringifies non-string date values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { day: [1, 2, 3], vol: [10, 20, 30] },
      columns: [
        { name: 'day', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'vol', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'volume', columns: { date: 'day', volume: 'vol' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['1', '2', '3']);
  });

  it('attaches an inside dataZoom on the x-axis', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { day: ['a'], vol: [5] },
      columns: [
        { name: 'day', type: 'date', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'vol', type: 'integer', nullable: false, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'volume', columns: { date: 'day', volume: 'vol' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const zoom = opt.dataZoom as Array<{ type: string; xAxisIndex: number }>;
    expect(zoom[0].type).toBe('inside');
    expect(zoom[0].xAxisIndex).toBe(0);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'volume', columns: { date: 'missing', volume: 'also_missing' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual([]);
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([]);
  });

  it('drops rows whose volume is non-finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { day: ['d1', 'd2', 'd3'], vol: [1000, NaN, 1800] },
      columns: [
        { name: 'day', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'vol', type: 'float', nullable: true, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'volume', columns: { date: 'day', volume: 'vol' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['d1', 'd3']);
    const series = opt.series as Array<{ data: number[] }>;
    expect(series[0].data).toEqual([1000, 1800]);
  });

  it('renders the empty state when no volume is finite', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { day: ['d1'], vol: [NaN] },
      columns: [
        { name: 'day', type: 'date', nullable: false, uniqueCount: 1, nullCount: 0 },
        { name: 'vol', type: 'float', nullable: true, uniqueCount: 1, nullCount: 0 },
      ],
      rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'volume', columns: { date: 'day', volume: 'vol' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    const props = el.props as { message?: string };
    expect(props.message).toBe('No volume to chart');
  });
});
