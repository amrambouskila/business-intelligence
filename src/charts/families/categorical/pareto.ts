import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { aggregatedCategoryValues } from '@/charts/echarts/aggregatedCategoryValues';
import type { CategoryValue } from '@/charts/echarts/finiteCategoryValues';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/**
 * Strictly-positive (category, value) pairs. A Pareto chart ranks non-negative
 * magnitudes and expresses a cumulative percentage of their total, so zero/negative
 * values are dropped — this also guarantees total > 0, avoiding a divide-by-zero
 * (NaN/Infinity) cumulative line.
 */
function paretoPairs(data: DataView, config: ChartConfig): CategoryValue[] {
  return aggregatedCategoryValues(data, config).filter((p) => p.value > 0);
}

class ParetoRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return paretoPairs(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = paretoPairs(data, config).sort((a, b) => b.value - a.value);
    const total = pairs.reduce((sum, p) => sum + p.value, 0);

    const categories = pairs.map((p) => p.name);
    const values = pairs.map((p) => p.value);

    let running = 0;
    const cumulative = pairs.map((p) => {
      running += p.value;
      return (100 * running) / total;
    });

    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: categories },
      { type: 'value', axisLine: false },
    );

    const percentAxis = {
      type: 'value',
      name: '%',
      min: 0,
      max: 100,
      axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
      splitLine: { show: false },
    };

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      xAxis: axes.xAxis,
      yAxis: [axes.yAxis, percentAxis] as EChartsOption['yAxis'],
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        },
        {
          type: 'line',
          yAxisIndex: 1,
          data: cumulative,
          lineStyle: { color: categoricalColor(theme.colorScale, 1, theme.foreground), width: 2 },
          itemStyle: { color: categoricalColor(theme.colorScale, 1, theme.foreground) },
        },
      ],
      grid: buildGrid({ right: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'pareto',
  family: 'categorical',
  name: 'Pareto Chart',
  description: 'Descending bars with a cumulative-percentage line',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new ParetoRenderer(),
});
