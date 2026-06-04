import { describe, it, expect } from 'vitest';
import '@/charts/families/time-series/event_timeline';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'event_timeline', columns: { date: 'date', label: 'label' }, options: {} };

function view(type: 'datetime' | 'category' = 'datetime'): DataView {
  return {
    sourceId: 'x', rows: [], filters: [],
    columnArrays: { date: ['2024-01-01', '2024-01-02', null], label: ['Kickoff', '', 'Done'] },
    columns: [
      { name: 'date', type, nullable: true, uniqueCount: 3, nullCount: 1 },
      { name: 'label', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 },
    ],
    rowCount: 3,
  };
}

describe('event_timeline', () => {
  const renderer = () => chartRegistry.get('event_timeline')!.createRenderer() as EChartsBaseRenderer;

  it('registers date and label roles', () => {
    const def = chartRegistry.get('event_timeline')!;
    expect(def.family).toBe('time-series');
    expect(def.compatibleShapes).toContain('event_log');
    expect(def.requiredColumns.map((c) => c.role)).toEqual(['date', 'label']);
  });

  it('renders labeled event points on a time axis', () => {
    const opt = renderer().buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string }).type).toBe('time');
    const series = opt.series as Array<{ data: Array<[string, string, string]>; label: { formatter: (p: { data: [string, string, string] }) => string } }>;
    expect(series[0].data).toEqual([['2024-01-01', 'Events', 'Kickoff']]);
    expect(series[0].label.formatter({ data: ['2024-01-01', 'Events', 'Kickoff'] })).toBe('Kickoff');
    expect(series[0].label.formatter({ data: ['2024-01-01', 'Events', undefined as unknown as string] })).toBe('');
    expect(series[0].label.formatter({} as unknown as { data: [string, string, string] })).toBe('');
  });

  it('uses a category axis for non-temporal dates and renders an empty state when no labels remain', () => {
    const opt = renderer().buildOption(view('category'), cfg, theme()) as EChartsOption;
    expect((opt.xAxis as { type: string; data: string[] }).type).toBe('category');
    expect((opt.xAxis as { data: string[] }).data).toEqual(['2024-01-01']);
    const empty = view();
    empty.columnArrays.label = ['', ' ', null];
    const el = chartRegistry.get('event_timeline')!.createRenderer().render(empty, cfg, theme());
    expect((el.props as { message?: string }).message).toBe('No events to chart');
  });

  it('falls back to empty data when configured columns are missing', () => {
    const opt = renderer().buildOption(view(), { ...cfg, columns: { date: 'missing', label: 'also_missing' } }, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([]);
  });
});
