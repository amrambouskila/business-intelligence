import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/gain_chart';
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

const cfg: ChartConfig = { chartType: 'gain_chart', columns: { x: 'x', gain: 'gain' }, options: {} };

describe('gain_chart registration', () => {
  it('registers under type "gain_chart" in the statistical family', () => {
    const def = chartRegistry.get('gain_chart');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('gain_chart buildOption', () => {
  const def = () => chartRegistry.get('gain_chart')!;

  it('sorts finite x/gain pairs and adds a diagonal baseline', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { x: [0.3, 'bad', 0.1, 0.2], gain: [0.8, 1.0, 0.4, Number.NaN] },
      columns: [],
      rowCount: 4,
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[][]; lineStyle?: { color: string; width?: number; type?: string } }>;
    expect(series[0].name).toBe('Gain');
    expect(series[0].data).toEqual([[0.1, 0.4], [0.3, 0.8]]);
    expect(series[0].lineStyle).toEqual({ color: '#f00', width: 2 });
    expect(series[1].data).toEqual([[0, 0], [1, 1]]);
  });

  it('renders the empty state when no finite pairs remain', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: { x: [NaN], gain: ['bad'] }, columns: [], rowCount: 1 };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No gain values to chart');
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No gain values to chart');
  });
});
