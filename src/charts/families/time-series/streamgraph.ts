import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type ThemeRiverDatum = [string, number, string];

/** [date, value, series] triples for rows whose value is finite. */
function riverData(data: DataView, config: ChartConfig): ThemeRiverDatum[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const series = data.columnArrays[config.columns['series']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(dates.length, series.length, values.length);
  const triples: ThemeRiverDatum[] = [];
  for (let i = 0; i < n; i++) {
    const value = values[i];
    if (Number.isFinite(value)) {
      triples.push([String(dates[i]), value as number, String(series[i])]);
    }
  }
  return triples;
}

class StreamgraphRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return riverData(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No series values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const triples = riverData(data, config);

    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';

    return {
      // themeRiver pulls its band colors from the global palette, not per-series itemStyle.
      color: theme.colorScale,
      tooltip: buildTooltip('axis'),
      legend: { bottom: 8, textStyle: { color: theme.foreground } },
      singleAxis: {
        top: 32,
        bottom: 56,
        type: isTime ? 'time' : 'category',
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        axisLine: { lineStyle: { color: theme.gridColor } },
        splitLine: { lineStyle: { color: theme.gridColor } },
      },
      series: [
        {
          type: 'themeRiver',
          data: triples,
          label: { color: theme.foreground },
        },
      ],
    };
  }
}

chartRegistry.register({
  type: 'streamgraph',
  family: 'time-series',
  name: 'Streamgraph',
  description: 'Flowing stacked series totals over time (themeRiver)',
  renderer: 'echarts',
  compatibleShapes: ['time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'series', acceptedTypes: ['category', 'text'], label: 'Series' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new StreamgraphRenderer(),
});
