import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/umap_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00', '#0f0'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 'umap_plot', columns: { x: 'x', y: 'y' }, options: {} };
const view = (): DataView => ({ sourceId: 'x', rows: [], filters: [], rowCount: 3, columnArrays: { x: [1, 2, 'bad'], y: [3, 4, 5] }, columns: [] });

describe('umap_plot', () => {
  it('plots finite embedding coordinates with the second palette color', () => {
    const opt = (chartRegistry.get('umap_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    const series = (opt.series as Array<{ name: string; data: unknown[]; itemStyle: { color: string } }>)[0];
    expect(series.name).toBe('UMAP');
    expect(series.data).toEqual([[1, 3], [2, 4]]);
    expect(series.itemStyle.color).toBe('#0f0');
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = { chartType: 'umap_plot', columns: { x: 'missing_x', y: 'missing_y' }, options: {} };
    expect((chartRegistry.get('umap_plot')!.createRenderer().render(view(), missing, theme()).props as { message: string }).message)
      .toBe('No UMAP coordinates to chart');
  });
});
