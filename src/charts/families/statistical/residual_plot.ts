import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/** [predicted, residual] pairs where both values are finite. */
function finitePairs(data: DataView, config: ChartConfig): [number, number][] {
  const predicted = (data.columnArrays[config.columns['predicted']] ?? []) as unknown[];
  const residual = (data.columnArrays[config.columns['residual']] ?? []) as unknown[];
  const pairs: [number, number][] = [];
  for (let i = 0; i < predicted.length; i++) {
    const p = predicted[i];
    const r = residual[i];
    if (Number.isFinite(p) && Number.isFinite(r)) pairs.push([p as number, r as number]);
  }
  return pairs;
}

class ResidualPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePairs(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No residuals to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = finitePairs(data, config);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['predicted'], nameGap: 30 },
      { type: 'value', name: config.columns['residual'], nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'scatter',
        data: points,
        itemStyle: { color },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: theme.gridColor },
          data: [{ yAxis: 0 }],
        },
      }],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'residual_plot',
  family: 'statistical',
  name: 'Residual Plot',
  description: 'Residuals against predicted values with a zero reference line',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'generic'],
  requiredColumns: [
    { role: 'predicted', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Predicted' },
    { role: 'residual', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Residual' },
  ],
  createRenderer: () => new ResidualPlotRenderer(),
});
