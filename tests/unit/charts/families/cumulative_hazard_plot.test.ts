import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/cumulative_hazard_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'cumulative_hazard_plot', columns: { time: 'time', event: 'event' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 3,
    columnArrays: { time: [1, 2, 3], event: [1, 0, 1] },
    columns: [],
  };
}

describe('cumulative_hazard_plot', () => {
  it('registers in the statistical family', () => {
    expect(chartRegistry.get('cumulative_hazard_plot')!.family).toBe('statistical');
  });

  it('builds a stepped Nelson-Aalen cumulative hazard series', () => {
    const opt = (chartRegistry.get('cumulative_hazard_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ step: string; data: number[][]; areaStyle: { opacity: number } }>)[0];
    expect(series.step).toBe('end');
    expect(series.data[0]).toEqual([0, 0]);
    expect(series.data[1][1]).toBeCloseTo(1 / 3, 10);
    expect(series.data[3][1]).toBeCloseTo(1 + 1 / 3, 10);
    expect(series.areaStyle.opacity).toBe(0.12);
  });

  it('renders an empty state when no observations remain', () => {
    const dv: DataView = { ...view(), columnArrays: { time: [NaN], event: [1] }, rowCount: 1 };
    const el = chartRegistry.get('cumulative_hazard_plot')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No survival observations to chart');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = { chartType: 'cumulative_hazard_plot', columns: { time: 'missing_time', event: 'missing_event' }, options: {} };
    const el = chartRegistry.get('cumulative_hazard_plot')!.createRenderer().render(view(), missing, theme());
    expect((el.props as { message: string }).message).toBe('No survival observations to chart');
  });
});
