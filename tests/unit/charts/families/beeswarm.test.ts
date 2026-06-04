import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/beeswarm';
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

function view(groups: unknown[], values: unknown[]): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays: { g: groups, v: values }, columns: [], rowCount: Math.max(groups.length, values.length) };
}

const cfg: ChartConfig = { chartType: 'beeswarm', columns: { group: 'g', value: 'v' }, options: {} };

describe('beeswarm', () => {
  it('registers with group/value roles in the distribution family', () => {
    const def = chartRegistry.get('beeswarm');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['group', 'value']);
  });

  it('builds deterministic grouped swarm offsets and drops non-finite values', () => {
    const opt = (chartRegistry.get('beeswarm')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['B', 'A', 'B', 'A'], [2, 4, 1, NaN]), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ type: string; data: number[][]; itemStyle: { color: string; opacity: number } }>)[0];
    expect(series.type).toBe('scatter');
    expect(series.itemStyle).toEqual({ color: '#f00', opacity: 0.72 });
    expect(series.data).toEqual([[4, 1], [1, 0], [2, 0.12]]);
    const formatter = ((opt.yAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter);
    expect(formatter(0)).toBe('B');
    expect(formatter(1)).toBe('A');
    expect(formatter(9)).toBe('');
  });

  it('spreads repeated group values around the group baseline', () => {
    const opt = (chartRegistry.get('beeswarm')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A', 'A', 'A', 'A'], [1, 2, 3, 4]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[][] }>;
    expect(series[0].data.map((point) => point[1])).toEqual([0, 0.12, -0.12, 0.24]);
  });

  it('renders the empty state when grouped finite values are unavailable', () => {
    const el = chartRegistry.get('beeswarm')!.createRenderer().render(view([], [1, 2]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });

  it('renders the empty state when referenced columns are missing', () => {
    const dv: DataView = { sourceId: 'x', rows: [], filters: [], columnArrays: {}, columns: [], rowCount: 0 };
    const el = chartRegistry.get('beeswarm')!.createRenderer().render(dv, cfg, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });
});
