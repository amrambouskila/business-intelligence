import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class StepRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const xCol = config.columns['x'];
    const yCol = config.columns['y'];
    const xData = data.columnArrays[xCol] ?? [];
    const yData = (data.columnArrays[yCol] ?? []) as (number | string)[];

    // Detect if x column is datetime
    const xMeta = data.columns.find((c) => c.name === xCol);
    const isTime = xMeta?.type === 'datetime' || xMeta?.type === 'date';

    // For time axis, pair [x, y] as data; for category, use separate axis data
    const seriesData = isTime ? xData.map((x, i) => [x, yData[i]]) : yData;
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category', data: xData.map(String), splitLine: false },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'cross' } }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'line',
        step: 'end',
        data: seriesData as (number | string | (number | string | Date)[])[],
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        symbol: 'none',
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'step',
  family: 'time-series',
  name: 'Step Chart',
  description: 'Discrete state changes over time as a stepped line',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'two_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['datetime', 'date', 'numeric', 'integer', 'category'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new StepRenderer(),
});
