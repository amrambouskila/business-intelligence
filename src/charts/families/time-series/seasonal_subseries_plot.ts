import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type SeasonalRows = Map<string, number[]>;

function seasonalRows(data: DataView, config: ChartConfig): SeasonalRows {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(dates.length, values.length);
  const rows: SeasonalRows = new Map(MONTH_LABELS.map((label) => [label, []]));
  for (let i = 0; i < n; i++) {
    const parsed = new Date(String(dates[i]));
    const value = values[i];
    if (!Number.isNaN(parsed.getTime()) && typeof value === 'number' && Number.isFinite(value)) {
      rows.get(MONTH_LABELS[parsed.getUTCMonth()])!.push(value);
    }
  }
  return rows;
}

function populated(rows: SeasonalRows): Array<[string, number[]]> {
  return [...rows.entries()].filter(([, values]) => values.length > 0);
}

class SeasonalSubseriesPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return populated(seasonalRows(data, config)).length === 0;
  }

  protected emptyMessage(): string {
    return 'No seasonal values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = populated(seasonalRows(data, config));
    const maxLen = rows.reduce((max, [, values]) => Math.max(max, values.length), 0);
    const xData = Array.from({ length: maxLen }, (_, i) => String(i + 1));
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: xData, splitLine: false },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      legend: { data: rows.map(([month]) => month), bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: rows.map(([month, values], index) => {
        const color = categoricalColor(theme.colorScale, index, theme.foreground);
        return {
          name: month,
          type: 'line',
          data: values,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color, width: 1.5 },
          itemStyle: { color },
        };
      }),
      grid: buildGrid({ bottom: 76 }),
    };
  }
}

chartRegistry.register({
  type: 'seasonal_subseries_plot',
  family: 'time-series',
  name: 'Seasonal Subseries Plot',
  description: 'Seasonal slices of a time series grouped by month',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new SeasonalSubseriesPlotRenderer(),
});
