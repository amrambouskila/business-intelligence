import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type SparklinePoint = [string | number, number];

function sparklinePoints(data: DataView, config: ChartConfig): SparklinePoint[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(dates.length, values.length);
  const points: SparklinePoint[] = [];
  for (let i = 0; i < n; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) points.push([String(dates[i]), value]);
  }
  return points;
}

class SparklineRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return sparklinePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No time-series values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = sparklinePoints(data, config);
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    return {
      tooltip: { show: false },
      xAxis: {
        type: isTime ? 'time' : 'category',
        show: false,
      },
      yAxis: {
        type: 'value',
        show: false,
        scale: true,
      },
      series: [{
        type: 'line',
        data: points,
        smooth: true,
        symbol: 'none',
        lineStyle: { color, width: 2 },
        areaStyle: { opacity: 0.08, color },
      }],
      grid: { left: 6, right: 6, top: 6, bottom: 6 },
    };
  }
}

chartRegistry.register({
  type: 'sparkline',
  family: 'time-series',
  name: 'Sparkline',
  description: 'Compact trend line with minimal chart furniture',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'two_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'Date' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new SparklineRenderer(),
});
