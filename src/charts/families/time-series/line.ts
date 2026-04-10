import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class LineRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const xCol = config.columns['x'];
    const yCol = config.columns['y'];
    const xData = data.columnArrays[xCol] ?? [];
    const yData = (data.columnArrays[yCol] ?? []) as (number | string)[];

    // Detect if x column is datetime
    const xMeta = data.columns.find((c) => c.name === xCol);
    const isTime = xMeta?.type === 'datetime' || xMeta?.type === 'date';

    // For time axis, pair [x, y] as data; for category, use separate axis data
    const seriesData = isTime
      ? xData.map((x, i) => [x, yData[i]])
      : yData;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      xAxis: isTime
        ? {
            type: 'time',
            axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
            axisLine: { lineStyle: { color: theme.gridColor } },
          }
        : {
            type: 'category',
            data: xData.map(String),
            axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
            axisLine: { lineStyle: { color: theme.gridColor } },
          },
      yAxis: {
        type: 'value',
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        splitLine: { lineStyle: { color: theme.gridColor } },
      },
      series: [{
        type: 'line',
        data: seriesData as (number | string | (number | string | Date)[])[],
        smooth: false,
        lineStyle: { color: theme.colorScale[0], width: 2 },
        itemStyle: { color: theme.colorScale[0] },
        symbol: 'none',
      }],
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
      ],
    };
  }
}

chartRegistry.register({
  type: 'line',
  family: 'time-series',
  name: 'Line Chart',
  description: 'Continuous line over an ordered axis',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'two_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['datetime', 'date', 'numeric', 'integer', 'category'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new LineRenderer(),
});
