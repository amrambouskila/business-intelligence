import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/mean_ci_band';
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

const cfg: ChartConfig = { chartType: 'mean_ci_band', columns: { x: 'x', mean: 'mean', lower: 'lo', upper: 'hi' }, options: {} };

describe('mean_ci_band registration', () => {
  it('registers under type "mean_ci_band" in the statistical family', () => {
    const def = chartRegistry.get('mean_ci_band');
    expect(def).toBeDefined();
    expect(def!.family).toBe('statistical');
    expect(def!.renderer).toBe('echarts');
  });
});

describe('mean_ci_band buildOption', () => {
  const def = () => chartRegistry.get('mean_ci_band')!;

  it('builds lower, interval, and mean series from finite interval rows', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {
        x: ['A', 'B', 'C', 'D', 'E'],
        mean: [10, 'bad', 30, 40, 50],
        lo: [8, 17, Number.NaN, 35, 45],
        hi: [12, 23, 35, Infinity, 'bad'],
      },
      columns: [],
      rowCount: 5,
    };
    const opt = (def().createRenderer() as EChartsBaseRenderer).buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as { data: string[] }).data).toEqual(['A']);
    const series = opt.series as Array<{ name: string; type: string; data: number[]; stack?: string; areaStyle?: { color?: string; opacity: number }; lineStyle?: { color?: string; width?: number; opacity?: number } }>;
    expect(series.map((s) => s.name)).toEqual(['Lower', 'Interval', 'Mean']);
    expect(series[0].data).toEqual([8]);
    expect(series[1].data).toEqual([4]);
    expect(series[1].areaStyle).toEqual({ color: '#0f0', opacity: 0.25 });
    expect(series[2].data).toEqual([10]);
    expect(series[2].lineStyle).toEqual({ color: '#f00', width: 2 });
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = def().createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No confidence intervals to chart');
  });
});
