import { describe, it, expect } from 'vitest';
import '@/charts/families/statistical/ice_plot';
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

const cfg: ChartConfig = { chartType: 'ice_plot', columns: { entity: 'entity', feature_value: 'x', predicted: 'pred' }, options: {} };

function dv(columnArrays: DataView['columnArrays']): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount: 5 };
}

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('ice_plot')!.createRenderer() as EChartsBaseRenderer;
}

describe('ice_plot registration', () => {
  it('registers entity, feature, and prediction roles', () => {
    const def = chartRegistry.get('ice_plot')!;
    expect(def.family).toBe('statistical');
    expect(def.renderer).toBe('echarts');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['entity', 'feature_value', 'predicted']);
  });
});

describe('ice_plot buildOption', () => {
  it('groups finite rows into one sorted line per entity', () => {
    const opt = renderer().buildOption(dv({
      entity: ['b', 'a', 'b', 'a', 'c'],
      x: [2, 2, 1, 1, 3],
      pred: [0.4, 0.8, 0.1, 0.3, NaN],
    }), cfg, theme()) as EChartsOption;

    const series = opt.series as Array<{ name: string; data: number[][]; lineStyle: { color: string; opacity: number } }>;
    expect((opt.xAxis as { name: string }).name).toBe('x');
    expect((opt.yAxis as { name: string }).name).toBe('Predicted');
    expect(series.map((s) => s.name)).toEqual(['b', 'a']);
    expect(series[0].data).toEqual([[1, 0.1], [2, 0.4]]);
    expect(series[1].data).toEqual([[1, 0.3], [2, 0.8]]);
    expect(series[0].lineStyle).toEqual({ color: '#f00', width: 1.5, opacity: 0.45 });
    expect(series[1].lineStyle.color).toBe('#0f0');
  });

  it('falls back to empty series when referenced columns are missing', () => {
    const opt = renderer().buildOption(dv({}), cfg, theme()) as EChartsOption;
    expect(opt.series).toEqual([]);
  });
});

describe('ice_plot empty guard', () => {
  it('renders the empty state when no finite curves remain', () => {
    const el = renderer().render(dv({ entity: ['a'], x: [1], pred: [Infinity] }), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No ICE curves to chart');
  });

  it('renders a chart when a finite point exists', () => {
    const el = renderer().render(dv({ entity: ['a'], x: [1], pred: [0.2] }), cfg, theme());
    expect(el.props).toHaveProperty('option');
  });
});
