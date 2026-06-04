import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/radar';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'radar', columns: { metric: 'metric', value: 'value' }, options: {} };

function view(): DataView {
  return {
    sourceId: 'x', rows: [], filters: [], rowCount: 3,
    columnArrays: { metric: ['A', 'B', 'C'], value: [10, 20, Number.NaN] },
    columns: [],
  };
}

describe('radar', () => {
  it('registers metric/value roles', () => {
    expect(chartRegistry.get('radar')!.requiredColumns.map((role) => role.role)).toEqual(['metric', 'value']);
  });

  it('builds radar indicators and metric values from finite rows', () => {
    const opt = (chartRegistry.get('radar')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.radar as { indicator: Array<{ name: string; max: number }> }).indicator).toEqual([{ name: 'A', max: 20 }, { name: 'B', max: 20 }]);
    const series = (opt.series as Array<{ data: Array<{ value: number[]; name: string }>; areaStyle: { color: string; opacity: number } }>)[0];
    expect(series.data[0]).toEqual({ value: [10, 20], name: 'value' });
    expect(series.areaStyle).toEqual({ color: '#f00', opacity: 0.16 });
  });

  it('renders an empty state when no metric values remain or columns are missing', () => {
    const dv: DataView = { ...view(), columnArrays: { metric: ['A'], value: [NaN] }, rowCount: 1 };
    expect((chartRegistry.get('radar')!.createRenderer().render(dv, cfg, theme()).props as { message: string }).message)
      .toBe('No metric values to chart');
    const missing: ChartConfig = { chartType: 'radar', columns: { metric: 'missing_metric', value: 'missing_value' }, options: {} };
    expect((chartRegistry.get('radar')!.createRenderer().render(view(), missing, theme()).props as { message: string }).message)
      .toBe('No metric values to chart');
  });
});
