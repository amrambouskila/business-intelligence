import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/lift_chart';
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

const cfg: ChartConfig = { chartType: 'lift_chart', columns: { x: 'x', lift: 'lift' }, options: {} };

describe('lift_chart registration', () => {
  it('registers under type "lift_chart" in the statistical family', () => {
    const def = chartRegistry.get('lift_chart');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('lift_chart buildOption', () => {
  const def = () => chartRegistry.get('lift_chart')!;

  it('sorts finite x/lift pairs and adds a y=1 baseline over the observed x range', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { x: [0.3, 'bad', 0.1, 0.2], lift: [1.4, 2.0, 2.2, Number.NaN] },
      columns: [],
      rowCount: 4,
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ name: string; data: number[][]; lineStyle?: { color: string; width?: number; type?: string } }>;
    expect(series[0].name).toBe('Lift');
    expect(series[0].data).toEqual([[0.1, 2.2], [0.3, 1.4]]);
    expect(series[0].lineStyle).toEqual({ color: '#f00', width: 2 });
    expect(series[1].data).toEqual([[0.1, 1], [0.3, 1]]);
  });

  it('renders the empty state when no finite pairs remain', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: { x: ['bad'], lift: [NaN] }, columns: [], rowCount: 1 };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No lift values to chart');
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No lift values to chart');
  });
});
