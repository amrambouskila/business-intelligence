import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/shap_summary_beeswarm';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = {
  chartType: 'shap_summary_beeswarm',
  columns: { feature: 'feature', shap_value: 'shap', feature_value: 'value' },
  options: {},
};

function dv(columnArrays: DataView['columnArrays']): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    columnArrays,
    columns: [],
    rowCount: Math.max(...Object.values(columnArrays).map((col) => col.length), 0),
  };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('shap_summary_beeswarm')!.createRenderer() as EChartsBaseRenderer;
}

describe('shap_summary_beeswarm registration', () => {
  it('registers under the statistical family', () => {
    const def = chartRegistry.get('shap_summary_beeswarm')!;
    expect(def.family).toBe('statistical');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['feature', 'shap_value', 'feature_value']);
  });
});

describe('shap_summary_beeswarm buildOption', () => {
  it('orders features by mean absolute SHAP value and applies deterministic offsets', () => {
    const opt = renderer().buildOption(dv({
      feature: ['b', 'a', 'b', 'a', 'c', 'c'],
      shap: [0.1, 2, -0.3, -2, 1, -1],
      value: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
    }), cfg, theme()) as EChartsOption;

    const yAxis = opt.yAxis as { min: number; max: number; axisLabel: { formatter: (value: number) => string } };
    expect(yAxis.min).toBe(-0.5);
    expect(yAxis.max).toBe(2.5);
    expect([0, 1, 2].map((i) => yAxis.axisLabel.formatter(i))).toEqual(['a', 'c', 'b']);
    expect(yAxis.axisLabel.formatter(99)).toBe('');

    const series = (opt.series as Array<{ data: number[][]; itemStyle: { color: string; opacity: number } }>)[0];
    expect(series.itemStyle).toEqual({ color: '#f00', opacity: 0.72 });
    expect(series.data).toEqual([
      [-2, 0, 0.4],
      [2, 0.1, 0.2],
      [-0.3, 2, 0.3],
      [0.1, 2.1, 0.1],
      [-1, 1, 0.6],
      [1, 1.1, 0.5],
    ]);
  });

  it('drops non-finite SHAP and feature values', () => {
    const opt = renderer().buildOption(dv({
      feature: ['a', 'b', 'c'],
      shap: [NaN, 0.5, 0.7],
      value: [0.1, Infinity, 0.3],
    }), cfg, theme()) as EChartsOption;

    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([[0.7, 0, 0.3]]);
  });

  it('breaks equal-importance feature ties by label and alternates both swarm sides', () => {
    const opt = renderer().buildOption(dv({
      feature: ['b', 'a', 'b', 'b'],
      shap: [1, -1, 0, 2],
      value: [0.1, 0.2, 0.3, 0.4],
    }), cfg, theme()) as EChartsOption;

    const yAxis = opt.yAxis as { axisLabel: { formatter: (value: number) => string } };
    expect([0, 1].map((i) => yAxis.axisLabel.formatter(i))).toEqual(['a', 'b']);
    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([
      [-1, 0, 0.2],
      [0, 1, 0.3],
      [1, 1.1, 0.1],
      [2, 0.9, 0.4],
    ]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const opt = renderer().buildOption(dv({}), cfg, theme()) as EChartsOption;
    expect(((opt.series as Array<{ data: number[][] }>)[0]).data).toEqual([]);
    expect((opt.yAxis as { max: number }).max).toBe(0.5);
  });
});

describe('shap_summary_beeswarm empty guard', () => {
  it('renders the empty state when no finite points remain', () => {
    const el = renderer().render(dv({ feature: ['a'], shap: [NaN], value: [0.1] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No SHAP values to chart');
  });

  it('renders a chart when a finite point exists', () => {
    const el = renderer().render(dv({ feature: ['a'], shap: [0.2], value: [0.1] }), cfg, theme());
    expect(el.props).toHaveProperty('option');
  });
});
