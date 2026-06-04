import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/funnel';
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

function render(dv: DataView, cfg: ChartConfig): EChartsOption {
  const def = chartRegistry.get('funnel')!;
  return (def.createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
}

describe('funnel registration', () => {
  it('registers under type "funnel" with the network-flow family', () => {
    const def = chartRegistry.get('funnel');
    expect(def).toBeDefined();
    expect(def!.family).toBe('network-flow');
    expect(def!.renderer).toBe('echarts');
  });

  it('declares stage and value as required columns', () => {
    const def = chartRegistry.get('funnel')!;
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['stage', 'value']);
  });
});

describe('funnel buildOption', () => {
  it('builds a descending funnel series of {name,value} slices', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { stage: ['Visit', 'Cart', 'Buy'], val: [100, 60, 25] },
      columns: [
        { name: 'stage', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'funnel', columns: { stage: 'stage', value: 'val' }, options: {} };
    const opt = render(dv, cfg);
    const series = opt.series as Array<{
      type: string;
      sort: string;
      data: Array<{ name: string; value: number; itemStyle: { color: string } }>;
    }>;
    expect(series[0].type).toBe('funnel');
    expect(series[0].sort).toBe('descending');
    expect(series[0].data.map((d) => d.name)).toEqual(['Visit', 'Cart', 'Buy']);
    expect(series[0].data.map((d) => d.value)).toEqual([100, 60, 25]);
    expect(series[0].data[0].itemStyle.color).toBe('#f00');
    expect(series[0].data[1].itemStyle.color).toBe('#0f0');
    expect(opt.xAxis).toBeUndefined();
    expect(opt.yAxis).toBeUndefined();
    expect(opt.grid).toBeUndefined();
  });

  it('stringifies non-string stage labels', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { stage: [1, 2], val: [10, 5] },
      columns: [
        { name: 'stage', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'funnel', columns: { stage: 'stage', value: 'val' }, options: {} };
    const opt = render(dv, cfg);
    const series = opt.series as Array<{ data: Array<{ name: string }> }>;
    expect(series[0].data.map((d) => d.name)).toEqual(['1', '2']);
  });

  it('drops non-finite values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { stage: ['a', 'b', 'c', 'd'], val: [10, NaN, Infinity, 4] },
      columns: [
        { name: 'stage', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 4, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'funnel', columns: { stage: 'stage', value: 'val' }, options: {} };
    const opt = render(dv, cfg);
    const series = opt.series as Array<{ data: Array<{ name: string; value: number }> }>;
    expect(series[0].data.map((d) => d.name)).toEqual(['a', 'd']);
    expect(series[0].data.map((d) => d.value)).toEqual([10, 4]);
  });

  it('reports empty when no finite values exist (rowCount > 0)', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { stage: ['a', 'b'], val: [NaN, Infinity] },
      columns: [
        { name: 'stage', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'val', type: 'float', nullable: true, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'funnel', columns: { stage: 'stage', value: 'val' }, options: {} };
    const renderer = chartRegistry.get('funnel')!.createRenderer();
    const el = renderer.render(dv, cfg, theme());
    expect(el).toBeDefined();
    const props = el.props as { message?: string };
    expect(props.message).toBe('No values to chart');
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'funnel', columns: { stage: 'missing', value: 'also_missing' }, options: {} };
    const renderer = chartRegistry.get('funnel')!.createRenderer() as EChartsBaseRenderer;
    const el = renderer.render(dv, cfg, theme());
    const props = el.props as { message?: string };
    expect(props.message).toBe('No values to chart');
  });
});
