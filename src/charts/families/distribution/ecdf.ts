import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/** Finite values of the `value` column, ascending. The sort backs the ECDF step plot. */
function sortedValues(data: DataView, config: ChartConfig): number[] {
  const col = config.columns['value'];
  return (data.columnArrays[col] ?? [])
    .filter((v): v is number => Number.isFinite(v))
    .sort((a, b) => a - b);
}

class EcdfRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return sortedValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const sorted = sortedValues(data, config);
    const n = sorted.length;
    const points = sorted.map((x, i) => [x, (i + 1) / n]);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['value'], nameGap: 30 },
      { type: 'value', name: 'Cumulative proportion', nameGap: 50, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'line',
        step: 'end',
        data: points,
        showSymbol: false,
        lineStyle: { color },
        itemStyle: { color },
      }],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'ecdf',
  family: 'distribution',
  name: 'ECDF',
  description: 'Empirical cumulative distribution function of a single numeric variable',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new EcdfRenderer(),
});
