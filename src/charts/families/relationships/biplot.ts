import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { finiteNumericRows } from '@/charts/echarts/multivariate';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class BiplotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteNumericRows(data, config, ['pc1', 'pc2']).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No PCA scores to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const scores = finiteNumericRows(data, config, ['pc1', 'pc2']).rows;
    const loadings = finiteNumericRows(data, config, ['loading_x', 'loading_y']).rows.slice(0, 8);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['pc1'], nameGap: 30 },
      { type: 'value', name: config.columns['pc2'], nameGap: 40, axisLine: false },
    );
    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        { name: 'Scores', type: 'scatter', data: scores, symbolSize: 5, itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.55 } },
        {
          name: 'Loadings',
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          data: loadings.map(([x, y], i) => ({ name: `L${i + 1}`, coords: [[0, 0], [x, y]] })),
          symbol: ['none', 'arrow'],
          lineStyle: { color: categoricalColor(theme.colorScale, 1, theme.foreground), width: 1.6 },
          label: { show: true, formatter: '{b}', color: theme.foreground, position: 'end' },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'inside', yAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'biplot',
  family: 'relationships',
  name: 'Biplot',
  description: 'PCA scores with loading vectors overlaid in component space',
  renderer: 'echarts',
  compatibleShapes: ['many_numeric', 'generic'],
  requiredColumns: [
    { role: 'pc1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'PC1' },
    { role: 'pc2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'PC2' },
    { role: 'loading_x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Loading X' },
    { role: 'loading_y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Loading Y' },
  ],
  createRenderer: () => new BiplotRenderer(),
});
