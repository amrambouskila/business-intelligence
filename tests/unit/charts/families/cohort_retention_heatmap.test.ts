import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/cohort_retention_heatmap';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#111', '#eee'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(retention: unknown[] = [100, 80, 95]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { cohort: ['Jan', 'Jan', 'Feb'], period: [0, 1, 0], retention },
    columns: [], rowCount: retention.length,
  };
}

const cfg: ChartConfig = { chartType: 'cohort_retention_heatmap', columns: { cohort: 'cohort', period: 'period', retention: 'retention' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('cohort_retention_heatmap')!.createRenderer() as EChartsBaseRenderer;
}

describe('cohort_retention_heatmap', () => {
  it('registers cohort, period, and retention roles', () => {
    const def = chartRegistry.get('cohort_retention_heatmap')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['cohort', 'period', 'retention']);
  });

  it('builds a labelled heatmap with a themed visual map', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['0', '1']);
    expect((opt.yAxis as { data: string[] }).data).toEqual(['Jan', 'Feb']);
    expect(opt.visualMap).toMatchObject({ min: 80, max: 100, inRange: { color: ['#111', '#eee'] } });
    const series = opt.series as Array<{ type: string; data: unknown[]; label: { formatter: (p: { value?: unknown[] }) => string } }>;
    expect(series[0].type).toBe('heatmap');
    expect(series[0].data).toEqual([[0, 0, 100], [0, 1, 95], [1, 0, 80]]);
    expect(series[0].label.formatter({ value: [0, 0, 80] })).toBe('80%');
    expect(series[0].label.formatter({ value: [0, 0] })).toBe('%');
    expect(series[0].label.formatter({})).toBe('');
  });

  it('drops invalid cells and sorts string periods numerically when possible', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { cohort: ['Jan', 'Jan', 'Jan', null], period: ['2', '10', 'x', '3'], retention: [70, 55, 40, 30] },
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2', 'x', '10']);
  });

  it('shows an empty state when no finite retention values exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No cohort retention values to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No cohort retention values to chart');
  });
});
