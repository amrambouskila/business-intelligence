import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/joy_plot';
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

function view(groups: unknown[], values: unknown[]): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays: { g: groups, v: values }, columns: [], rowCount: Math.max(groups.length, values.length) };
}

type JoySeries = {
  name: string;
  type: string;
  data: Array<[number, number]>;
  showSymbol: boolean;
  smooth: boolean;
  lineStyle: { color: string; width: number };
  areaStyle: { color: string; opacity: number };
};

const cfg: ChartConfig = { chartType: 'joy_plot', columns: { group: 'g', value: 'v' }, options: {} };

describe('joy_plot', () => {
  it('registers with group/value roles in the distribution family', () => {
    const def = chartRegistry.get('joy_plot');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['group', 'value']);
  });

  it('builds one overlapping density ridge per group', () => {
    const opt = (chartRegistry.get('joy_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['B', 'A', 'B', 'A'], [1, 10, 2, 11]), cfg, theme()) as EChartsOption;
    const series = opt.series as JoySeries[];
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      name: 'B',
      type: 'line',
      showSymbol: false,
      smooth: true,
      lineStyle: { color: '#f00', width: 2 },
      areaStyle: { color: '#f00', opacity: 0.28 },
    });
    expect(series[1].name).toBe('A');
    expect(series[1].lineStyle.color).toBe('#0f0');
    expect(series[0].data).toHaveLength(50);
  });

  it('uses Ungrouped for finite values without a matching group label', () => {
    const opt = (chartRegistry.get('joy_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view([], [1]), cfg, theme()) as EChartsOption;
    const series = opt.series as JoySeries[];
    expect(series[0].name).toBe('Ungrouped');
  });

  it('drops non-finite grouped values before density generation', () => {
    const opt = (chartRegistry.get('joy_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(['A', 'B'], [NaN, 2]), cfg, theme()) as EChartsOption;
    const series = opt.series as JoySeries[];
    expect(series).toHaveLength(1);
    expect(series[0].name).toBe('B');
  });

  it('renders the empty state when the group column is missing', () => {
    const el = chartRegistry.get('joy_plot')!.createRenderer().render(view(['A'], [1]), { chartType: 'joy_plot', columns: { group: 'missing', value: 'v' }, options: {} }, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });

  it('renders the empty state when the value column is missing', () => {
    const el = chartRegistry.get('joy_plot')!.createRenderer().render(view(['A'], [1]), { chartType: 'joy_plot', columns: { group: 'g', value: 'missing' }, options: {} }, theme());
    expect((el.props as { message: string }).message).toBe('No grouped numeric values to chart');
  });
});
