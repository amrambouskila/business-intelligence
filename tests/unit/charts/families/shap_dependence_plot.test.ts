import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/shap_dependence_plot';
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

const cfg: ChartConfig = { chartType: 'shap_dependence_plot', columns: { feature_value: 'x', shap_value: 'y' }, options: {} };

function dv(columnArrays: DataView['columnArrays']): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: 3 };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('shap_dependence_plot')!.createRenderer() as EChartsBaseRenderer;
}

describe('shap_dependence_plot registration', () => {
  it('registers numeric feature and SHAP roles', () => {
    const def = chartRegistry.get('shap_dependence_plot')!;
    expect(def.family).toBe('statistical');
    expect(def.compatibleShapes).toEqual(['two_numeric', 'category_numeric', 'generic']);
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['feature_value', 'shap_value']);
  });
});

describe('shap_dependence_plot buildOption', () => {
  it('sorts finite points by feature value and SHAP value', () => {
    const opt = renderer().buildOption(dv({ x: [2, 1, 1, 3], y: [0.4, 0.9, -0.1, Infinity] }), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { name: string }).name).toBe('x');
    expect((opt.yAxis as { name: string }).name).toBe('SHAP value');
    expect(((opt.series as Array<{ data: number[][]; itemStyle: { color: string } }>)[0]).data).toEqual([[1, -0.1], [1, 0.9], [2, 0.4]]);
    expect(((opt.series as Array<{ itemStyle: { color: string } }>)[0]).itemStyle.color).toBe('#f00');
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const opt = renderer().buildOption(dv({}), cfg, theme()) as EChartsOption;
    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([]);
  });
});

describe('shap_dependence_plot empty guard', () => {
  it('renders the empty state when no finite points remain', () => {
    const el = renderer().render(dv({ x: [NaN], y: [1] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No SHAP dependence values to chart');
  });

  it('renders a chart when a finite point exists', () => {
    const el = renderer().render(dv({ x: [1], y: [0.2] }), cfg, theme());
    expect(el.props).toHaveProperty('option');
  });
});
