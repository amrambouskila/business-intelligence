import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type HorizonPoint = [string, number];

function horizonPoints(data: DataView, config: ChartConfig): HorizonPoint[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(dates.length, values.length);
  const points: HorizonPoint[] = [];
  for (let i = 0; i < n; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) points.push([String(dates[i]), value]);
  }
  return points;
}

function bandData(points: HorizonPoint[], center: number, bandStart: number, bandSize: number): HorizonPoint[] {
  return points.map(([date, value]) => {
    const magnitude = Math.max(0, Math.abs(value - center) - bandStart);
    return [date, Math.min(magnitude, bandSize)];
  });
}

class HorizonChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return horizonPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No horizon values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = horizonPoints(data, config);
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const values = points.map(([, value]) => value);
    const center = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const maxDeviation = values.reduce((max, value) => Math.max(max, Math.abs(value - center)), 0);
    const bandSize = maxDeviation > 0 ? maxDeviation / 3 : 1;
    const baseColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const accentColor = categoricalColor(theme.colorScale, 1, theme.axisColor);
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category', data: points.map(([date]) => date), splitLine: false },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), axisLabel: { show: false } },
      series: [0, 1, 2].map((band) => ({
        name: `Band ${band + 1}`,
        type: 'line',
        data: bandData(points, center, band * bandSize, bandSize),
        symbol: 'none',
        lineStyle: { width: 1, color: band === 0 ? baseColor : accentColor },
        itemStyle: { color: band === 0 ? baseColor : accentColor },
        areaStyle: { opacity: 0.18 + band * 0.12, color: band === 0 ? baseColor : accentColor },
      })),
      grid: buildGrid({ top: 24, bottom: 40 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'horizon_chart',
  family: 'time-series',
  name: 'Horizon Chart',
  description: 'Dense time series folded into magnitude bands',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'two_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'Date' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new HorizonChartRenderer(),
});
