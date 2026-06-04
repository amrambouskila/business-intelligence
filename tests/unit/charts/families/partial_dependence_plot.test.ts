import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/partial_dependence_plot';
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

const cfg: ChartConfig = { chartType: 'partial_dependence_plot', columns: { feature_value: 'x', predicted: 'pred' }, options: {} };

function dv(columnArrays: DataView['columnArrays']): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: 4 };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('partial_dependence_plot')!.createRenderer() as EChartsBaseRenderer;
}

describe('partial_dependence_plot registration', () => {
  it('registers under the statistical family', () => {
    const def = chartRegistry.get('partial_dependence_plot')!;
    expect(def.family).toBe('statistical');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['feature_value', 'predicted']);
  });
});

describe('partial_dependence_plot buildOption', () => {
  it('averages duplicate feature values and sorts the response curve', () => {
    const opt = renderer().buildOption(dv({ x: [2, 1, 1, 3, 4], pred: [0.4, 0.2, 0.8, Infinity, NaN] }), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { name: string }).name).toBe('x');
    expect((opt.yAxis as { name: string }).name).toBe('Predicted');
    const series = (opt.series as Array<{ data: number[][]; smooth: boolean; itemStyle: { color: string } }>)[0];
    expect(series.data).toEqual([[1, 0.5], [2, 0.4]]);
    expect(series.smooth).toBe(true);
    expect(series.itemStyle.color).toBe('#f00');
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const opt = renderer().buildOption(dv({}), cfg, theme()) as EChartsOption;
    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([]);
  });
});

describe('partial_dependence_plot empty guard', () => {
  it('renders the empty state when no finite values remain', () => {
    const el = renderer().render(dv({ x: [1], pred: [NaN] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No partial dependence values to chart');
  });

  it('renders a chart when a finite value exists', () => {
    const el = renderer().render(dv({ x: [1], pred: [0.2] }), cfg, theme());
    expect(el.props).toHaveProperty('option');
  });
});
