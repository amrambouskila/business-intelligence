import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { associationMatrix, finiteNumericRows } from '@/charts/echarts/multivariate';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const ROLES = ['f1', 'f2', 'f3'];

function formatCell(params: { value?: unknown }): string {
  const value = Array.isArray(params.value) ? Number(params.value[2]) : 0;
  return value.toFixed(2);
}

class CorrelationHeatmapRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteNumericRows(data, config, ROLES).rows.length < 2;
  }

  protected emptyMessage(): string {
    return 'No numeric feature rows to correlate';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const input = finiteNumericRows(data, config, ROLES);
    const cells = associationMatrix(input, 'correlation').map((cell) => [input.names.indexOf(cell.col), input.names.indexOf(cell.row), cell.value]);
    const axes = buildCartesianAxes(theme, { type: 'category', data: input.names, splitLine: false }, { type: 'category', data: input.names, splitLine: false });
    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      visualMap: { min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: theme.divergingScale }, textStyle: { color: theme.axisColor } },
      series: [{ name: 'Correlation', type: 'heatmap', data: cells, label: { show: true, color: theme.foreground, fontSize: theme.fontSize.small, formatter: formatCell } }],
      grid: buildGrid({ bottom: 70 }),
    };
  }
}

chartRegistry.register({
  type: 'correlation_heatmap',
  family: 'relationships',
  name: 'Correlation Heatmap',
  description: 'Feature-to-feature correlation matrix computed from numeric columns',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'f1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 1' },
    { role: 'f2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 2' },
    { role: 'f3', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 3' },
  ],
  createRenderer: () => new CorrelationHeatmapRenderer(),
});
