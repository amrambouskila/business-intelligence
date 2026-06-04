import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type Point = [number, number];

function points(data: DataView, config: ChartConfig): Point[] {
  const pc1 = data.columnArrays[config.columns['pc1']] ?? [];
  const pc2 = data.columnArrays[config.columns['pc2']] ?? [];
  const out: Point[] = [];
  for (let i = 0; i < Math.min(pc1.length, pc2.length); i++) {
    const x = pc1[i];
    const y = pc2[i];
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) out.push([x, y]);
  }
  return out;
}

class PcaScatterRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return points(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No PCA coordinates to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['pc1'], nameGap: 30 },
      { type: 'value', name: config.columns['pc2'], nameGap: 40, axisLine: false },
    );
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{ name: 'PCA scores', type: 'scatter', data: points(data, config), symbolSize: 6, itemStyle: { color, opacity: 0.75 } }],
      grid: buildGrid({ bottom: 50 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'inside', yAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'pca_scatter',
  family: 'relationships',
  name: 'PCA Scatter',
  description: 'PCA component scores plotted on the first two principal components',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'pc1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'PC1' },
    { role: 'pc2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'PC2' },
  ],
  createRenderer: () => new PcaScatterRenderer(),
});
