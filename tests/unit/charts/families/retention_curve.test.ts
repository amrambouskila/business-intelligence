import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/retention_curve';
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

function view(retention: unknown[] = [100, 80, 90, 70]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { period: [0, 1, 0, 1], retention },
    columns: [], rowCount: retention.length,
  };
}

const cfg: ChartConfig = { chartType: 'retention_curve', columns: { period: 'period', retention: 'retention' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('retention_curve')!.createRenderer() as EChartsBaseRenderer;
}

describe('retention_curve', () => {
  it('registers period and retention roles', () => {
    const def = chartRegistry.get('retention_curve')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['period', 'retention']);
  });

  it('averages duplicate periods into an ordered retention line', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['0', '1']);
    const series = opt.series as Array<{ type: string; smooth: boolean; data: number[]; areaStyle: { opacity: number } }>;
    expect(series[0].type).toBe('line');
    expect(series[0].smooth).toBe(true);
    expect(series[0].data).toEqual([95, 75]);
    expect(series[0].areaStyle.opacity).toBe(0.14);
    expect(opt.yAxis).toMatchObject({ min: 0, max: 100 });
  });

  it('drops invalid retention values', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { period: [0, null, 'later', 'x'], retention: [100, 70, 90, 'bad'] },
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: number[] }>;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['0', 'later']);
    expect(series[0].data).toEqual([100, 90]);
  });

  it('shows an empty state when no retention values exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No retention values to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No retention values to chart');
  });
});
