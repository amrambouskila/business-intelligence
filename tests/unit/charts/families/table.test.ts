import { describe, it, expect } from 'vitest';
import '@/charts/families/specialized/table';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#999',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

function view(): DataView {
  const rows = [
    { region: 'North', sales: 128.456, date: new Date('2024-01-02'), extra: null },
    { region: 'South', sales: Infinity, date: '2024-01-03', extra: 'ok' },
  ];
  return {
    sourceId: 'x',
    rows,
    filters: [],
    columnArrays: {
      region: rows.map((row) => row.region),
      sales: rows.map((row) => row.sales),
      date: rows.map((row) => row.date),
      extra: rows.map((row) => row.extra),
    },
    columns: [
      { name: 'region', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'sales', type: 'float', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'date', type: 'datetime', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'extra', type: 'text', nullable: true, uniqueCount: 1, nullCount: 1 },
    ],
    rowCount: rows.length,
  };
}

const cfg: ChartConfig = { chartType: 'table', columns: {}, options: {} };

function renderer(): EChartsBaseRenderer {
  return chartRegistry.get('table')!.createRenderer() as EChartsBaseRenderer;
}

describe('table', () => {
  it('registers as an any-columns specialized chart', () => {
    const def = chartRegistry.get('table')!;
    expect(def.family).toBe('specialized');
    expect(def.requiredColumns).toEqual([]);
    expect(def.compatibleShapes).toContain('ohlcv');
  });

  it('renders headers and formatted cell values as a graphic table', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    const graphic = opt.graphic as Array<{ children: Array<{ type: string; style?: { text?: string; fill?: string } }> }>;
    const texts = graphic[0].children.filter((child) => child.type === 'text').map((child) => child.style?.text);
    expect(texts).toEqual([
      'region', 'sales', 'date', 'extra',
      'North', '128.46', '2024-01-02', '',
      'South', '', '2024-01-03', 'ok',
    ]);
    expect(graphic[0].children[1].style?.fill).toBe('#fff');
  });

  it('shows an empty state when there are no rows or no columns', () => {
    expect(renderer().render({ ...view(), rows: [], rowCount: 0 }, cfg, theme()).props).toMatchObject({
      message: 'No table rows to display',
    });
    expect(renderer().render({ ...view(), columns: [] }, cfg, theme()).props).toMatchObject({
      message: 'No table rows to display',
    });
  });
});
