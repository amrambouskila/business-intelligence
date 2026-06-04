import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/pyramid_chart';
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

function view(left: unknown[] = [30, 40], right: unknown[] = [20, 50]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { category: ['A', 'B'], left_value: left, right_value: right },
    columns: [], rowCount: left.length,
  };
}

const cfg: ChartConfig = { chartType: 'pyramid_chart', columns: { category: 'category', left_value: 'left_value', right_value: 'right_value' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('pyramid_chart')!.createRenderer() as EChartsBaseRenderer;
}

describe('pyramid_chart registration', () => {
  it('registers category, left, and right roles', () => {
    const def = chartRegistry.get('pyramid_chart')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['category', 'left_value', 'right_value']);
  });
});

describe('pyramid_chart buildOption', () => {
  it('builds mirrored horizontal bars with absolute-value axis labels', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['A', 'B']);
    const series = opt.series as Array<{ name: string; data: number[]; itemStyle: { color: string } }>;
    expect(series[0].name).toBe('Left');
    expect(series[0].data).toEqual([-30, -40]);
    expect(series[1].data).toEqual([20, 50]);
    expect(series[0].itemStyle.color).toBe('#f00');
    expect(series[1].itemStyle.color).toBe('#0f0');
    const formatter = (opt.xAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter;
    expect(formatter(-40)).toBe('40');
  });

  it('drops rows with non-finite paired values and uses magnitudes', () => {
    const opt = renderer().buildOption(view([-5, NaN], [7, 8]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['A']);
    expect(series[0].data).toEqual([-5]);
    expect(series[1].data).toEqual([7]);
  });
});

describe('pyramid_chart empty guard', () => {
  it('shows an empty state when no paired finite values exist', () => {
    const el = renderer().render(view([NaN], [Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No pyramid values to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No pyramid values to chart');
  });
});
