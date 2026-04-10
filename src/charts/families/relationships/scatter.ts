import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class ScatterRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const xCol = config.columns['x'];
    const yCol = config.columns['y'];
    const xData = (data.columnArrays[xCol] ?? []) as number[];
    const yData = (data.columnArrays[yCol] ?? []) as number[];

    const points = xData.map((x, i) => [x, yData[i]]);

    return {
      tooltip: {
        trigger: 'item',
      },
      xAxis: {
        type: 'value',
        name: xCol,
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        axisLine: { lineStyle: { color: theme.gridColor } },
        splitLine: { lineStyle: { color: theme.gridColor } },
      },
      yAxis: {
        type: 'value',
        name: yCol,
        nameLocation: 'middle',
        nameGap: 40,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        splitLine: { lineStyle: { color: theme.gridColor } },
      },
      series: [{
        type: 'scatter',
        data: points,
        symbolSize: 6,
        itemStyle: { color: theme.colorScale[0], opacity: 0.7 },
        large: true,
        largeThreshold: 5000,
      }],
      grid: { left: 60, right: 20, top: 20, bottom: 50 },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'inside', yAxisIndex: 0 },
      ],
    };
  }
}

chartRegistry.register({
  type: 'scatter',
  family: 'relationships',
  name: 'Scatter Plot',
  description: 'Two numeric variables plotted as points',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new ScatterRenderer(),
});
