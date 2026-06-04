import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/faceted_dashboard_grid';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#999',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(values: unknown[] = [10, 5, 2, 7, 'bad']): DataView {
  return {
    sourceId: 'x',
    rows: [],
    filters: [],
    columnArrays: {
      facet: ['North', 'North', 'South', 'South', 'South'],
      category: ['Q1', 'Q2', 'Q1', 'Q2', 'Q3'],
      value: values,
    },
    columns: [],
    rowCount: values.length,
  };
}

const cfg: ChartConfig = {
  chartType: 'faceted_dashboard_grid',
  columns: { facet: 'facet', category: 'category', value: 'value' },
  options: {},
};

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('faceted_dashboard_grid')!.createRenderer() as EChartsBaseRenderer;
}

describe('faceted_dashboard_grid', () => {
  it('registers facet, category, and value roles', () => {
    const def = chartRegistry.get('faceted_dashboard_grid')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns.map((role) => role.role)).toEqual(['facet', 'category', 'value']);
  });

  it('renders facet KPI cards with sorted breakdown bars', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ type: string; shape?: { width?: number }; style?: { text?: string; fill?: string } }> }>;
    const texts = graphic[0].children.filter((child) => child.type === 'text').map((child) => child.style?.text);
    expect(texts).toEqual(['North', '15', 'Q1', 'Q2', 'South', '9', 'Q2', 'Q1']);
    const bars = graphic[0].children.filter((child) => child.type === 'rect' && child.style?.fill === '#f00');
    expect(bars[0].shape?.width).toBe(76);
  });

  it('uses zero-width bars when every category value is zero', () => {
    const opt = renderer().buildOption(view([0, 0]), cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ type: string; shape?: { width?: number }; style?: { fill?: string } }> }>;
    const bars = graphic[0].children.filter((child) => child.type === 'rect' && child.style?.fill === '#f00');
    expect(bars[0].shape?.width).toBe(0);
  });

  it('shows an empty state when no finite values exist', () => {
    const el = renderer().render(view([NaN, Infinity, 'bad']), cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No dashboard facets to chart');
  });

  it('shows an empty state when referenced columns are missing', () => {
    const el = renderer().render({ ...view(), columnArrays: {}, rowCount: 0 }, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No dashboard facets to chart');
  });

  it('drops rows with missing facet or category values', () => {
    const dv: DataView = {
      ...view(),
      columnArrays: {
        facet: [null, 'North', 'South'],
        category: ['Q1', null, 'Q2'],
        value: [10, 20, 30],
      },
      rowCount: 3,
    };
    const opt = renderer().buildOption(dv, cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ type: string; style?: { text?: string } }> }>;
    const texts = graphic[0].children.filter((child) => child.type === 'text').map((child) => child.style?.text);
    expect(texts).toEqual(['South', '30', 'Q2']);
  });
});
