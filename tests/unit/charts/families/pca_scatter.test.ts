import { describe, it, expect } from 'vitest';
import '@/charts/families/relationships/pca_scatter';
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

const cfg: ChartConfig = { chartType: 'pca_scatter', columns: { pc1: 'pc1', pc2: 'pc2' }, options: {} };

function view(): DataView {
  return { sourceId: 'x', rows: [], filters: [], rowCount: 3, columnArrays: { pc1: [1, 2, 'bad'], pc2: [3, 4, 5] }, columns: [] };
}

describe('pca_scatter', () => {
  it('registers pc1/pc2 roles and plots finite component scores', () => {
    const def = chartRegistry.get('pca_scatter')!;
    expect(def.requiredColumns.map((role) => role.role)).toEqual(['pc1', 'pc2']);
    const opt = (def.createRenderer() as EChartsBaseRenderer).buildOption(view(), cfg, theme()) as EChartsOption;
    expect((opt.series as Array<{ data: unknown[] }>)[0].data).toEqual([[1, 3], [2, 4]]);
  });

  it('renders an empty state for missing or non-finite coordinates', () => {
    const missing: ChartConfig = { chartType: 'pca_scatter', columns: { pc1: 'missing_pc1', pc2: 'missing_pc2' }, options: {} };
    expect((chartRegistry.get('pca_scatter')!.createRenderer().render(view(), missing, theme()).props as { message: string }).message)
      .toBe('No PCA coordinates to chart');
  });
});
