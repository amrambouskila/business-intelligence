import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finitePoints(data: DataView, config: ChartConfig): Array<[string, number]> {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const vols = data.columnArrays[config.columns['rolling_vol']] ?? [];
  const points: Array<[string, number]> = [];
  const n = Math.min(dates.length, vols.length);

  for (let i = 0; i < n; i++) {
    const vol = vols[i];
    if (typeof vol === 'number' && Number.isFinite(vol)) {
      points.push([String(dates[i]), vol]);
    }
  }

  return points;
}

class RollingVolatilityPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No rolling volatility values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category' },
      { type: 'value', name: config.columns['rolling_vol'], axisLine: false },
    );
    axes.yAxis = { ...(axes.yAxis as object), axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small, formatter: '{value}%' } };

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        name: 'Rolling volatility',
        type: 'line',
        data: finitePoints(data, config),
        smooth: true,
        showSymbol: false,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.14 },
      }],
      grid: buildGrid({ bottom: 50 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'rolling_volatility_plot',
  family: 'finance',
  name: 'Rolling Volatility Plot',
  description: 'Rolling realized volatility over time',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'ohlcv', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'rolling_vol', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Rolling Volatility' },
  ],
  createRenderer: () => new RollingVolatilityPlotRenderer(),
});
