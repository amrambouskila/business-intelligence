import { describe, it, expect } from 'vitest';
import '@/charts/families/distribution/stem_and_leaf';
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

function view(values: unknown[]): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays: { value: values }, columns: [], rowCount: values.length };
}

type BarSeries = { type: string; data: number[]; itemStyle: { color: string } };
type Tooltip = { formatter: (params: unknown) => string };

const cfg: ChartConfig = { chartType: 'stem_and_leaf', columns: { value: 'value' }, options: {} };

describe('stem_and_leaf', () => {
  it('registers in the distribution family', () => {
    const def = chartRegistry.get('stem_and_leaf');
    expect(def).toBeDefined();
    expect(def!.family).toBe('distribution');
    expect(def!.requiredColumns.map((role) => role.role)).toEqual(['value']);
  });

  it('builds stem buckets from rounded finite values', () => {
    const opt = (chartRegistry.get('stem_and_leaf')!.createRenderer() as EChartsBaseRenderer).buildOption(view([12.2, 14.8, 25, Number.POSITIVE_INFINITY]), cfg, theme()) as EChartsOption;
    const series = (opt.series as BarSeries[])[0];
    expect(series).toMatchObject({ type: 'bar', data: [2, 1], itemStyle: { color: '#f00' } });
    expect((opt.yAxis as { data: string[] }).data).toEqual(['1', '2']);
    const formatter = (opt.tooltip as Tooltip).formatter;
    expect(formatter({ dataIndex: 0 })).toBe('Stem 1<br/>Leaves: 2 5');
    expect(formatter([{ dataIndex: 1 }])).toBe('Stem 2<br/>Leaves: 5');
    expect(formatter({})).toBe('');
  });

  it('renders an empty state for missing finite values', () => {
    const el = chartRegistry.get('stem_and_leaf')!.createRenderer().render(view([NaN]), cfg, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });

  it('renders an empty state when the value column is missing', () => {
    const el = chartRegistry.get('stem_and_leaf')!.createRenderer().render(view([1]), { ...cfg, columns: { value: 'missing' } }, theme());
    expect((el.props as { message: string }).message).toBe('No numeric values to chart');
  });
});
