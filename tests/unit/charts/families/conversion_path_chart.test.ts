import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/conversion_path_chart';
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

function view(count: unknown[] = [100, 60]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { source: ['Visit', 'Signup'], target: ['Signup', 'Paid'], count },
    columns: [], rowCount: count.length,
  };
}

const cfg: ChartConfig = { chartType: 'conversion_path_chart', columns: { source: 'source', target: 'target', count: 'count' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('conversion_path_chart')!.createRenderer() as EChartsBaseRenderer;
}

describe('conversion_path_chart', () => {
  it('registers source, target, and count roles', () => {
    const def = chartRegistry.get('conversion_path_chart')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['source', 'target', 'count']);
  });

  it('builds a sankey path graph from stage transitions', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ type: string; data: Array<{ name: string }>; links: unknown[]; label: { color: string } }>;
    expect(series[0].type).toBe('sankey');
    expect(series[0].data.map((d) => d.name)).toEqual(['Visit', 'Signup', 'Paid']);
    expect(series[0].links).toEqual([
      { source: 'Visit', target: 'Signup', value: 100 },
      { source: 'Signup', target: 'Paid', value: 60 },
    ]);
    expect(series[0].label.color).toBe('#fff');
  });

  it('drops invalid links', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { source: ['Visit', null, 'Trial'], target: ['Signup', 'Paid', null], count: [100, 50, 'x'] },
      rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ links: unknown[] }>;
    expect(series[0].links).toEqual([{ source: 'Visit', target: 'Signup', value: 100 }]);
  });

  it('shows an empty state when no path counts exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No conversion paths to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No conversion paths to chart');
  });
});
