import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/ranking_table_with_sparklines';
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

function view(ranks: unknown[] = [2, 1, 1, 3, 2]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: {
      date: ['2024-02-01', '2024-01-01', '2024-01-01', '2024-02-01', '2024-01-01'],
      entity: ['A', 'A', 'B', 'B', 'C'],
      rank: ranks,
    },
    columns: [], rowCount: ranks.length,
  };
}

const cfg: ChartConfig = {
  chartType: 'ranking_table_with_sparklines',
  columns: { date: 'date', entity: 'entity', rank: 'rank' },
  options: {},
};

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('ranking_table_with_sparklines')!.createRenderer() as EChartsBaseRenderer;
}

describe('ranking_table_with_sparklines', () => {
  it('registers date, entity, and rank roles', () => {
    const def = chartRegistry.get('ranking_table_with_sparklines')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'entity', 'rank']);
  });

  it('builds a ranked graphic table with sparkline polylines', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ type: string; shape?: { points?: [number, number][] }; style?: { text?: string; stroke?: string } }> }>;
    const texts = graphic[0].children.filter((child) => child.type === 'text').map((child) => child.style?.text);
    expect(texts).toEqual(['Rank', 'Entity', 'Sparkline', '2', 'A', '2', 'C', '3', 'B']);
    const polylines = graphic[0].children.filter((child) => child.type === 'polyline');
    expect(polylines).toHaveLength(3);
    expect(polylines[0].style?.stroke).toBe('#f00');
    expect(polylines[0].shape?.points).toHaveLength(2);
  });

  it('centers single-point sparklines and handles constant rank ranges', () => {
    const opt = renderer().buildOption(view([2]), cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ type: string; shape?: { points?: [number, number][] } }> }>;
    const polylines = graphic[0].children.filter((child) => child.type === 'polyline');
    expect(polylines[0].shape?.points?.[0][0]).toBe(290);
    expect(polylines[0].shape?.points?.[0][1]).toBe(39);
  });

  it('drops invalid ranking rows', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { date: ['2024-01-01', null, '2024-01-01'], entity: ['A', 'B', null], rank: [1, 2, 'bad'] },
      rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ type: string; style?: { text?: string } }> }>;
    expect(graphic[0].children.filter((child) => child.type === 'polyline')).toHaveLength(1);
    expect(graphic[0].children.map((child) => child.style?.text).filter(Boolean)).toContain('A');
  });

  it('shows an empty state when no finite ranks exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No ranking rows to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No ranking rows to chart');
  });
});
