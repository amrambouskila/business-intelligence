import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/t_sne_plot';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { EChartsOption } from 'echarts';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff', gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

const cfg: ChartConfig = { chartType: 't_sne_plot', columns: { x: 'x', y: 'y' }, options: {} };
const view = (): DataView => ({ sourceId: 'x', rows: [], filters: [], rowCount: 3, columnArrays: { x: [1, 2, NaN], y: [3, 4, 5] }, columns: [] });

describe('t_sne_plot', () => {
  it('plots finite embedding coordinates', () => {
    const opt = (chartRegistry.get('t_sne_plot')!.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ name: string; data: unknown[] }>)[0]).toMatchObject({ name: 't-SNE', data: [[1, 3], [2, 4]] });
  });

  it('renders an empty state when referenced columns are missing', () => {
    const missing: ChartConfig = { chartType: 't_sne_plot', columns: { x: 'missing_x', y: 'missing_y' }, options: {} };
    expect((chartRegistry.get('t_sne_plot')!.createRenderer().render(view(), missing, theme()).props as { message: string }).message)
      .toBe('No t-SNE coordinates to chart');
  });
});
