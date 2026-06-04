import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/survival_curve';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'survival_curve', columns: { time: 'time', event: 'event' }, options: {} };

function view(events: unknown[] = [1, 0, 1]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 3,
    columnArrays: { time: [1, 2, 3], event: events },
    columns: [],
  };
}

describe('survival_curve', () => {
  it('registers in the statistical family', () => {
    expect(chartRegistry.get('survival_curve')!.family).toBe('statistical');
  });

  it('builds a stepped Kaplan-Meier survival series in percent', () => {
    const opt = (chartRegistry.get('survival_curve')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ step: string; data: number[][] }>)[0];
    expect(series.step).toBe('end');
    expect(series.data[0]).toEqual([0, 100]);
    expect(series.data[1][1]).toBeCloseTo(66.6666666667, 8);
    expect(series.data[3][1]).toBe(0);
    expect(((opt.yAxis as { axisLabel: { formatter: string } }).axisLabel).formatter).toBe('{value}%');
  });

  it('renders an empty state when no observations remain', () => {
    const dv: DataView = { ...view(), columnArrays: { time: [NaN], event: [1] }, rowCount: 1 };
    const el = chartRegistry.get('survival_curve')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No survival observations to chart');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = { chartType: 'survival_curve', columns: { time: 'missing_time', event: 'missing_event' }, options: {} };
    const el = chartRegistry.get('survival_curve')!.createRenderer().render(view(), missing, theme());
    expect((el.props as { message: string }).message).toBe('No survival observations to chart');
  });
});
