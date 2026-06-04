import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/** Row indices whose volume value is finite. */
function validRows(data: DataView, config: ChartConfig): number[] {
  const volumes = data.columnArrays[config.columns['volume']] ?? [];
  const rows: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (Number.isFinite(volumes[i])) rows.push(i);
  }
  return rows;
}

class VolumeRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return validRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No volume to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dates = data.columnArrays[config.columns['date']] ?? [];
    const volumes = data.columnArrays[config.columns['volume']] ?? [];
    const rows = validRows(data, config);

    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: rows.map((i) => String(dates[i])) },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'bar',
        data: rows.map((i) => volumes[i] as number),
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'volume',
  family: 'finance',
  name: 'Volume Bars',
  description: 'Trading volume bars over time',
  renderer: 'echarts',
  compatibleShapes: ['ohlcv', 'time_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'volume', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Volume' },
  ],
  createRenderer: () => new VolumeRenderer(),
});
