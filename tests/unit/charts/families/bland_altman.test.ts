import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/bland_altman';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'bland_altman', columns: { measure_a: 'a', measure_b: 'b' }, options: {} };

describe('bland_altman registration', () => {
  it('registers under type "bland_altman" in the statistical family', () => {
    const def = chartRegistry.get('bland_altman');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('bland_altman buildOption', () => {
  const def = () => chartRegistry.get('bland_altman')!;

  it('builds mean/difference points plus bias and limits-of-agreement reference lines', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { a: [10, 'bad', 30, 40], b: [12, 20, Infinity, 36] },
      columns: [],
      rowCount: 4,
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name?: string; type: string; data: number[][]; lineStyle?: { color: string; type: string }; itemStyle?: { color: string } }>;

    expect(series[0].type).toBe('scatter');
    expect(series[0].data).toEqual([[11, 2], [38, -4]]);
    expect(series[0].itemStyle).toEqual({ color: '#f00' });
    expect(series[1].name).toBe('Bias');
    expect(series[1].data).toEqual([[11, -1], [38, -1]]);
    expect(series[2].name).toBe('Upper LOA');
    expect(series[3].name).toBe('Lower LOA');
    expect(series[2].lineStyle).toEqual({ color: '#333', type: 'dashed' });
  });

  it('uses zero standard deviation for a single valid pair', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: { a: [10], b: [12] }, columns: [], rowCount: 1 };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[1].data).toEqual([[11, 2], [11, 2]]);
    expect(series[2].data).toEqual([[11, 2], [11, 2]]);
    expect(series[3].data).toEqual([[11, 2], [11, 2]]);
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No paired measures to chart');
  });
});
