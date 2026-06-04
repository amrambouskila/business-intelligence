import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function cumulativePoints(data: DataView, config: ChartConfig): number[][] {
  const values = (data.columnArrays[config.columns['value']] ?? [])
    .filter((v): v is number => Number.isFinite(v))
    .sort((a, b) => a - b);
  const n = values.length;
  return values.map((value, i) => [value, (i + 1) / n]);
}

class CumulativeDistributionPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return cumulativePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['value'], nameGap: 30 },
      { type: 'value', name: 'Cumulative probability', nameGap: 55, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'line',
        data: cumulativePoints(data, config),
        showSymbol: false,
        smooth: true,
        lineStyle: { color },
        itemStyle: { color },
      }],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'cumulative_distribution_plot',
  family: 'distribution',
  name: 'Cumulative Distribution Plot',
  description: 'Cumulative probability curve for sorted numeric observations',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new CumulativeDistributionPlotRenderer(),
});
