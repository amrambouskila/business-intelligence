import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/bump_chart';
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

function view(ranks: unknown[] = [2, 1, 1, 2]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['2024-02-01', '2024-01-01', '2024-02-01', '2024-01-01'], entity: ['A', 'A', 'B', 'B'], rank: ranks },
    columns: [], rowCount: ranks.length,
  };
}

const cfg: ChartConfig = { chartType: 'bump_chart', columns: { date: 'date', entity: 'entity', rank: 'rank' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('bump_chart')!.createRenderer() as EChartsBaseRenderer;
}

describe('bump_chart', () => {
  it('registers date, entity, and rank roles', () => {
    const def = chartRegistry.get('bump_chart')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'entity', 'rank']);
  });

  it('builds one inverted-rank line per entity sorted by date', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect(opt.yAxis).toMatchObject({ min: 1, max: 2, interval: 1, inverse: true });
    const series = opt.series as Array<{ name: string; type: string; data: unknown[]; lineStyle: { color: string } }>;
    expect(series.map((s) => s.name)).toEqual(['A', 'B']);
    expect(series[0].type).toBe('line');
    expect(series[0].data).toEqual([['2024-01-01', 1], ['2024-02-01', 2]]);
    expect(series[0].lineStyle.color).toBe('#f00');
  });

  it('drops invalid rank rows', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { date: ['2024-02-01', null, '2024-02-01', '2024-01-01'], entity: ['A', 'A', null, 'B'], rank: [2, 3, 1, 'bad'] },
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = opt.series as Array<{ data: unknown[] }>;
    expect(series[0].data).toEqual([['2024-02-01', 2]]);
  });

  it('shows an empty state when no rank values exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No rankings to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No rankings to chart');
  });
});
