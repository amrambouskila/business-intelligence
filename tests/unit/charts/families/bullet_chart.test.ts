import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/bullet_chart';
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

function view(actual: unknown[] = [80, 40]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      label: ['Revenue', 'Retention'],
      actual,
      target: [90, 50],
      range1: [60, 30],
      range2: [80, 45],
      range3: [100, 60],
    },
    columns: [],
    rowCount: actual.length,
  };
}

function cfg(): ChartConfig {
  return {
    chartType: 'bullet_chart',
    columns: { label: 'label', actual: 'actual', target: 'target', range1: 'range1', range2: 'range2', range3: 'range3' },
    options: {},
  };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('bullet_chart')!.createRenderer() as EChartsBaseRenderer;
}

describe('bullet_chart registration', () => {
  it('registers required KPI comparison roles', () => {
    const def = chartRegistry.get('bullet_chart')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['label', 'actual', 'target', 'range1', 'range2', 'range3']);
  });
});

describe('bullet_chart buildOption', () => {
  it('builds background ranges, actual bars, and target markers', () => {
    const opt = renderer().buildOption(view(), cfg(), theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Revenue', 'Retention']);
    const series = opt.series as Array<{ name: string; type: string; data: number[]; itemStyle: { color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['Range 3', 'Range 2', 'Range 1', 'Actual', 'Target']);
    expect(series[0].data).toEqual([100, 60]);
    expect(series[3].data).toEqual([80, 40]);
    expect(series[4].data).toEqual([90, 50]);
    expect(series[3].itemStyle.color).toBe('#f00');
    expect(series[4].itemStyle.color).toBe('#0f0');
  });

  it('drops rows when any numeric role is non-finite', () => {
    const opt = renderer().buildOption(view([80, NaN]), cfg(), theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Revenue']);
    expect((opt.series as Array<{ data: number[] }>)[3].data).toEqual([80]);
  });
});

describe('bullet_chart empty guard', () => {
  it('shows an empty state when no complete finite rows exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No bullet values to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No bullet values to chart');
  });
});
