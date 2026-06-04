import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finitePairs(data: DataView, config: ChartConfig): [number, number][] {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const lifts = data.columnArrays[config.columns['lift']] ?? [];
  const n = Math.min(xs.length, lifts.length);
  const pairs: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const lift = lifts[i];
    if (typeof x === 'number' && Number.isFinite(x) && typeof lift === 'number' && Number.isFinite(lift)) {
      pairs.push([x, lift]);
    }
  }

  return pairs.sort((a, b) => a[0] - b[0]);
}

class LiftChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePairs(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No lift values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = finitePairs(data, config);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['x'], nameGap: 30 },
      { type: 'value', name: config.columns['lift'], nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Lift',
          type: 'line',
          data: pairs,
          smooth: true,
          itemStyle: { color },
          lineStyle: { color, width: 2 },
        },
        {
          name: 'Baseline',
          type: 'line',
          data: [[pairs[0][0], 1], [pairs[pairs.length - 1][0], 1]],
          showSymbol: false,
          lineStyle: { color: theme.gridColor, type: 'dashed' },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'lift_chart',
  family: 'statistical',
  name: 'Lift Chart',
  description: 'Model lift across sorted population or decile bins',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'lift', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Lift' },
  ],
  createRenderer: () => new LiftChartRenderer(),
});
