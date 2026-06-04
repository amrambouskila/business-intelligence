import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type EventPoint = { date: string; label: string };

function eventLabel(params: unknown): string {
  const data = (params as { data?: unknown }).data;
  return Array.isArray(data) ? String(data[2] ?? '') : '';
}

function eventPoints(data: DataView, config: ChartConfig): EventPoint[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const labels = data.columnArrays[config.columns['label']] ?? [];
  const n = Math.min(dates.length, labels.length);
  const points: EventPoint[] = [];
  for (let i = 0; i < n; i++) {
    if (dates[i] != null && labels[i] != null && String(labels[i]).trim() !== '') {
      points.push({ date: String(dates[i]), label: String(labels[i]) });
    }
  }
  return points;
}

class EventTimelineRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return eventPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No events to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = eventPoints(data, config);
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category', data: points.map((point) => point.date), splitLine: false },
      { type: 'category', data: ['Events'], axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), axisLabel: { show: false } },
      series: [{
        type: 'scatter',
        data: points.map((point) => isTime ? [point.date, 'Events', point.label] : [point.date, 'Events', point.label]),
        symbolSize: 14,
        itemStyle: { color },
        label: {
          show: true,
          formatter: eventLabel,
          position: 'top',
          color: theme.foreground,
          fontSize: theme.fontSize.small,
        },
      }],
      grid: buildGrid({ top: 56, bottom: 52 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'event_timeline',
  family: 'time-series',
  name: 'Event Timeline',
  description: 'Labeled events placed along a time axis',
  renderer: 'echarts',
  compatibleShapes: ['intervals', 'time_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'text'], label: 'Date' },
    { role: 'label', acceptedTypes: ['category', 'text'], label: 'Label' },
  ],
  createRenderer: () => new EventTimelineRenderer(),
});
