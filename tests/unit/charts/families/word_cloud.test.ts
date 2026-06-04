import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/word_cloud';
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

function view(weights: unknown[] = [10, 4, 7]): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { word: ['alpha', 'beta', 'gamma'], weight: weights },
    columns: [], rowCount: weights.length,
  };
}

const cfg: ChartConfig = { chartType: 'word_cloud', columns: { word: 'word', weight: 'weight' }, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('word_cloud')!.createRenderer() as EChartsBaseRenderer;
}

describe('word_cloud', () => {
  it('registers word and weight roles', () => {
    const def = chartRegistry.get('word_cloud')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['word', 'weight']);
  });

  it('builds deterministic weighted text graphics sorted by weight', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ name: string; x: number; y: number; rotation: number; style: { font: string; fill: string } }> }>;
    expect(graphic[0].children.map((child) => child.name)).toEqual(['alpha', 'gamma', 'beta']);
    expect(graphic[0].children[0]).toMatchObject({ x: 0, y: 0, rotation: -0.08 });
    expect(graphic[0].children[1].x).not.toBe(0);
    expect(graphic[0].children[0].style.font).toContain('49px');
    expect(graphic[0].children[2].style.font).toContain('15px');
    expect(graphic[0].children[0].style.fill).toBe('#f00');
  });

  it('uses the fallback font size for constant weights and drops invalid rows', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: { word: ['alpha', null, 'gamma', 'bad'], weight: [1, 1, Infinity, 'x'] },
      rowCount: 4,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ style: { font: string } }> }>;
    expect(graphic[0].children).toHaveLength(1);
    expect(graphic[0].children[0].style.font).toContain('26px');
  });

  it('formats text-item tooltips and handles empty params', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const formatter = (opt.tooltip as { formatter: (p: unknown) => string }).formatter;
    expect(formatter({ name: 'alpha', value: 10 })).toBe('alpha: 10');
    expect(formatter({})).toBe('');
  });

  it('shows an empty state when no finite weights exist', () => {
    const el = renderer().render(view([NaN, Infinity]), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No words to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No words to chart');
  });
});
