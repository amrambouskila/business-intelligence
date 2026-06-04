import { describe, it, expect } from 'vitest';
import '@/charts/families/categorical/pictogram';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

describe('pictogram registration', () => {
  it('registers under type "pictogram" with the categorical family', () => {
    const def = chartRegistry.get('pictogram');
    expect(def).toBeDefined();
    expect(def!.family).toBe('categorical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('pictogram buildOption', () => {
  const def = () => chartRegistry.get('pictogram')!;

  it('builds a repeated pictorial bar series from positive aggregated category values', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { cat: ['A', 'A', 'B', 'C'], val: [10, 5, 0, 20] },
      columns: [],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'pictogram', columns: { category: 'cat', value: 'val' }, options: {} };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ type: string; symbol: string; symbolRepeat: boolean; symbolClip: boolean; data: Array<{ value: number; itemStyle: { color: string } }> }>)[0];

    expect((opt.xAxis as { data: string[] }).data).toEqual(['A', 'C']);
    expect(series.type).toBe('pictorialBar');
    expect(series.symbol).toBe('rect');
    expect(series.symbolRepeat).toBe(true);
    expect(series.symbolClip).toBe(true);
    expect(series.data).toEqual([
      { value: 15, itemStyle: { color: '#f00' } },
      { value: 20, itemStyle: { color: '#0f0' } },
    ]);
  });

  it('renders the empty state when no positive values remain', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [], columnArrays: { cat: ['A'], val: [-1] }, columns: [], rowCount: 1,
    };
    const cfg: ChartConfig = { chartType: 'pictogram', columns: { category: 'cat', value: 'val' }, options: {} };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No positive values to display');
  });
});
