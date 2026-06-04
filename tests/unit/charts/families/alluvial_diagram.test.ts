import { describe, it, expect } from 'vitest';
import '@/charts/families/network-flow/alluvial_diagram';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function dataView(columnArrays: Record<string, unknown[]>, rowCount: number): DataView {
  return { sourceId: 'x', rows: [], filters: [], columnArrays, columns: [], rowCount };
}

const cfg: ChartConfig = {
  chartType: 'alluvial_diagram',
  columns: { stage1: 's1', stage2: 's2', stage3: 's3', value: 'val' },
  options: {},
};
const renderer = () => chartRegistry.get('alluvial_diagram')!.createRenderer() as EChartsBaseRenderer;

type SankeySeries = {
  type: string;
  data: Array<{ name: string }>;
  links: Array<{ source: string; target: string; value: number }>;
  nodeAlign: string;
  label: { color: string };
  lineStyle: { color: string; opacity: number };
};

describe('alluvial_diagram registration', () => {
  it('registers three stages and a value role', () => {
    const def = chartRegistry.get('alluvial_diagram');
    expect(def).toBeDefined();
    expect(def!.family).toBe('network-flow');
    expect(def!.requiredColumns.map((c) => c.role)).toEqual(['stage1', 'stage2', 'stage3', 'value']);
  });
});

describe('alluvial_diagram buildOption', () => {
  it('aggregates adjacent stage transitions into a sankey series', () => {
    const dv = dataView({
      s1: ['Visit', 'Visit', 'Signup'],
      s2: ['Signup', 'Signup', 'Trial'],
      s3: ['Trial', 'Churn', 'Paid'],
      val: [10, 5, 3],
    }, 3);
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const series = (opt.series as SankeySeries[])[0];

    expect(series.type).toBe('sankey');
    expect(series.nodeAlign).toBe('justify');
    expect(series.data.map((n) => n.name)).toEqual(['Visit', 'Signup', 'Trial', 'Churn', 'Paid']);
    expect(series.links).toEqual([
      { source: 'Visit', target: 'Signup', value: 15 },
      { source: 'Signup', target: 'Trial', value: 13 },
      { source: 'Signup', target: 'Churn', value: 5 },
      { source: 'Trial', target: 'Paid', value: 3 },
    ]);
    expect(series.label.color).toBe('#fff');
    expect(series.lineStyle).toEqual({ color: 'gradient', opacity: 0.45 });
  });

  it('drops rows with non-finite values', () => {
    const opt = renderer().buildOption(dataView({ s1: ['a'], s2: ['b'], s3: ['c'], val: [Number.NaN] }, 1), cfg, theme()) as EChartsOption;
    const series = (opt.series as SankeySeries[])[0];
    expect(series.data).toEqual([]);
    expect(series.links).toEqual([]);
  });

  it('renders empty state when no paths exist', () => {
    const el = renderer().render(dataView({}, 0), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No paths to chart');
  });
});
