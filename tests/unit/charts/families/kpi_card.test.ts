import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/kpi_card';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#999',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(values: unknown[] = [128.4, 87.2], names: unknown[] = ['Revenue', 'Retention']): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { metric_name: names, value: values },
    columns: [
      { name: 'metric_name', type: 'category', nullable: false, uniqueCount: names.length, nullCount: 0 },
      { name: 'value', type: 'float', nullable: false, uniqueCount: values.length, nullCount: 0 },
    ],
    rowCount: values.length,
  };
}

function cfg(columns: Record<string, string> = { metric_name: 'metric_name', value: 'value' }): ChartConfig {
  return { chartType: 'kpi_card', columns, options: {} };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('kpi_card')!.createRenderer() as EChartsBaseRenderer;
}

describe('kpi_card registration', () => {
  it('registers in the specialized family with metric and value roles', () => {
    const def = chartRegistry.get('kpi_card')!;
    expect(def.family).toBe('specialized');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['metric_name', 'value']);
  });
});

describe('kpi_card buildOption', () => {
  it('renders the first finite KPI as themed graphic text', () => {
    const opt = renderer().buildOption(view(), cfg(), theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ style: { text: string; fill: string; font: string } }> }>;
    expect(graphic[0].children[0].style.text).toBe('Revenue');
    expect(graphic[0].children[0].style.fill).toBe('#999');
    expect(graphic[0].children[1].style.text).toBe('128.4');
    expect(graphic[0].children[1].style.fill).toBe('#f00');
    expect(graphic[0].children[1].style.font).toContain('42px Arial');
  });

  it('skips non-finite KPI values before choosing the first card', () => {
    const opt = renderer().buildOption(view([NaN, 42], ['Bad', 'Good']), cfg(), theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ style: { text: string } }> }>;
    expect(graphic[0].children[0].style.text).toBe('Good');
    expect(graphic[0].children[1].style.text).toBe('42');
  });
});

describe('kpi_card empty guard', () => {
  it('shows an empty state when no finite KPI values exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg(), theme());
    expect((el.props as { message?: string }).message).toBe('No KPI value to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, columns: [], rowCount: 0 }, cfg({ metric_name: 'missing', value: 'missing2' }), theme());
    expect((el.props as { message?: string }).message).toBe('No KPI value to chart');
  });
});
