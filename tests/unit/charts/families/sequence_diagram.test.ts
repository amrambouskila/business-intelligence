import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/sequence_diagram';
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

function view(orders: unknown[] = [2, 1, 3]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      order: orders,
      actor: ['B', 'A', 'C'],
      action: ['reply', 'request', 'store'],
      target_actor: ['C', 'B', 'D'],
    },
    columns: [], rowCount: orders.length,
  };
}

const cfg: ChartConfig = {
  chartType: 'sequence_diagram',
  columns: { order: 'order', actor: 'actor', action: 'action', target_actor: 'target_actor' },
  options: {},
};

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('sequence_diagram')!.createRenderer() as EChartsBaseRenderer;
}

describe('sequence_diagram', () => {
  it('registers order, actor, action, and target roles', () => {
    const def = chartRegistry.get('sequence_diagram')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['order', 'actor', 'action', 'target_actor']);
  });

  it('builds ordered actor-lane action lines', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['A', 'B', 'C', 'D']);
    expect(opt.yAxis).toMatchObject({ min: 1, max: 3, inverse: true });
    const series = opt.series as Array<{ name: string; type: string; data: unknown[]; symbol: string; lineStyle: { color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['request', 'reply', 'store']);
    expect(series[0]).toMatchObject({ type: 'line', symbol: 'arrow' });
    expect(series[0].data).toEqual([['A', 1, 'B'], ['B', 1, 'B']]);
    expect(series[0].lineStyle.color).toBe('#f00');
  });

  it('drops invalid events before lane construction', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: {
        order: [1, 2, NaN, 'bad'],
        actor: ['A', null, 'C', 'D'],
        action: ['request', 'skip', 'store', 'fail'],
        target_actor: ['B', 'C', null, 'E'],
      },
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['A', 'B']);
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series).toHaveLength(1);
  });

  it('does not duplicate actor lanes when target actors already exist', () => {
    const dv: DataView = {
      ...view([1, 2]),
      columnArrays: {
        order: [1, 2],
        actor: ['A', 'B'],
        action: ['request', 'reply'],
        target_actor: ['B', 'A'],
      },
      rowCount: 2,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { data: string[] }).data).toEqual(['A', 'B']);
  });

  it('formats tooltips and handles empty params', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const formatter = (opt.tooltip as { formatter: (p: unknown) => string }).formatter;
    expect(formatter({ seriesName: 'request', data: ['A', 1, 'B'] })).toBe('request<br/>A -> B<br/>Step 1');
    expect(formatter({})).toBe('');
  });

  it('shows an empty state when no finite order exists', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No sequence events to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No sequence events to chart');
  });
});
