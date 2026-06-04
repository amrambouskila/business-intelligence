import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/funnel_area';
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

function view(values: unknown[] = [100, 60, 20], stages: unknown[] = ['Visit', 'Trial', 'Buy']): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { stage: stages, value: values },
    columns: [], rowCount: values.length,
  };
}

const cfg: ChartConfig = { chartType: 'funnel_area', columns: { stage: 'stage', value: 'value' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('funnel_area')!.createRenderer() as EChartsBaseRenderer;
}

describe('funnel_area registration', () => {
  it('registers stage/value roles in the specialized family', () => {
    const def = chartRegistry.get('funnel_area')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['stage', 'value']);
  });
});

describe('funnel_area buildOption', () => {
  it('builds an area-scaled funnel with themed slices', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{
      type: string;
      minSize: string;
      maxSize: string;
      label: { color: string; position: string };
      data: Array<{ name: string; value: number; itemStyle: { color: string } }>;
    }>;
    expect(series[0].type).toBe('funnel');
    expect(series[0].minSize).toBe('20%');
    expect(series[0].maxSize).toBe('90%');
    expect(series[0].label).toMatchObject({ position: 'inside', color: '#fff' });
    expect(series[0].data.map((d) => d.name)).toEqual(['Visit', 'Trial', 'Buy']);
    expect(series[0].data[0].itemStyle.color).toBe('#f00');
  });

  it('stringifies stages and drops non-finite values', () => {
    const opt = renderer().buildOption(view([100, NaN, 20], [1, 2, 3]), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: Array<{ name: string; value: number }> }>;
    expect(series[0].data).toEqual([{ name: '1', value: 100, itemStyle: { color: '#f00' } }, { name: '3', value: 20, itemStyle: { color: '#0f0' } }]);
  });
});

describe('funnel_area empty guard', () => {
  it('shows an empty state when no finite values exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No funnel values to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No funnel values to chart');
  });
});
