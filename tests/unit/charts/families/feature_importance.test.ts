import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/feature_importance';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0', '#00f'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const def = () => chartRegistry.get('feature_importance')!;
const renderer = () => def().createRenderer() as EChartsBaseRenderer;

interface SeriesEntry {
  type: string;
  data: number[];
  barWidth?: string;
  itemStyle: { color: string };
}

describe('feature_importance registration', () => {
  it('registers under type "feature_importance" with the statistical family', () => {
    const d = chartRegistry.get('feature_importance');
    expect(d).toBeDefined();
    expect(d!.type).toBe('feature_importance');
    expect(d!.family).toBe('statistical');
    expect(d!.renderer).toBe('echarts');
    expect(d!.requiredColumns.map((c) => c.role)).toEqual(['feature', 'importance']);
  });
});

describe('feature_importance buildOption', () => {
  it('sorts descending by importance and reverses for the bottom-up category axis', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { feat: ['a', 'b', 'c'], imp: [0.1, 0.5, 0.3] },
      columns: [
        { name: 'feat', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'imp', type: 'float', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      rowCount: 3,
    };
    const cfg: ChartConfig = { chartType: 'feature_importance', columns: { feature: 'feat', importance: 'imp' }, options: {} };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;

    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.xAxis as Record<string, unknown>).axisLine).toBeUndefined();
    expect((opt.yAxis as Record<string, unknown>).type).toBe('category');

    // descending sort is [b 0.5, c 0.3, a 0.1]; reversed for the axis => [a, c, b]
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'c', 'b']);

    const series = opt.series as SeriesEntry[];
    expect(series).toHaveLength(1);
    expect(series[0].type).toBe('bar');
    expect(series[0].data).toEqual([0.1, 0.3, 0.5]);
    expect(series[0].barWidth).toBe('60%');
    expect(series[0].itemStyle.color).toBe('#f00');
  });

  it('coerces non-string feature values to strings for the category axis', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { feat: [1, 2], imp: [9, 4] },
      columns: [
        { name: 'feat', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'imp', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'feature_importance', columns: { feature: 'feat', importance: 'imp' }, options: {} };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    // descending [feat 1 -> 9, feat 2 -> 4]; reversed => ['2', '1']
    expect((opt.yAxis as { data: string[] }).data).toEqual(['2', '1']);
    expect((opt.series as SeriesEntry[])[0].data).toEqual([4, 9]);
  });

  it('drops non-finite importances, keeping feature/importance aligned', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { feat: ['a', 'b', 'c', 'd'], imp: [0.2, NaN, Infinity, 0.8] },
      columns: [
        { name: 'feat', type: 'category', nullable: false, uniqueCount: 4, nullCount: 0 },
        { name: 'imp', type: 'numeric', nullable: false, uniqueCount: 4, nullCount: 0 },
      ],
      rowCount: 4,
    };
    const cfg: ChartConfig = { chartType: 'feature_importance', columns: { feature: 'feat', importance: 'imp' }, options: {} };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    // finite pairs sorted desc: [d 0.8, a 0.2]; reversed => ['a', 'd']
    expect((opt.yAxis as { data: string[] }).data).toEqual(['a', 'd']);
    expect((opt.series as SeriesEntry[])[0].data).toEqual([0.2, 0.8]);
  });

  it('falls back to empty arrays when referenced columns are missing', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: {}, columns: [], rowCount: 0,
    };
    const cfg: ChartConfig = { chartType: 'feature_importance', columns: { feature: 'missing', importance: 'also_missing' }, options: {} };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    expect((opt.yAxis as { data: string[] }).data).toEqual([]);
    expect((opt.series as SeriesEntry[])[0].data).toEqual([]);
  });
});

describe('feature_importance empty guard', () => {
  it('renders the empty state when no finite importances remain', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { feat: ['a', 'b'], imp: [NaN, Infinity] },
      columns: [
        { name: 'feat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'imp', type: 'numeric', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'feature_importance', columns: { feature: 'feat', importance: 'imp' }, options: {} };
    const el = renderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No importances to chart');
  });

  it('renders a chart (not the empty state) when at least one finite importance is present', () => {
    const dv: DataView = {
      sourceId: 'x', rows: [], filters: [],
      columnArrays: { feat: ['a', 'b'], imp: [NaN, 0.5] },
      columns: [
        { name: 'feat', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'imp', type: 'numeric', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      rowCount: 2,
    };
    const cfg: ChartConfig = { chartType: 'feature_importance', columns: { feature: 'feat', importance: 'imp' }, options: {} };
    const el = renderer().render(dv, cfg, theme());
    expect((el.props as { message?: string }).message).toBeUndefined();
    expect(el.props).toHaveProperty('option');
  });
});
