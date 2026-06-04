import type { CustomSeriesRenderItem, EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type RangeDatum = [number, number, number, string];

function toRangeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function rangeData(data: DataView, config: ChartConfig): { labels: string[]; rows: RangeDatum[]; timeAxis: boolean } {
  const labels = data.columnArrays[config.columns['label']] ?? [];
  const starts = data.columnArrays[config.columns['start']] ?? [];
  const ends = data.columnArrays[config.columns['end']] ?? [];
  const startMeta = data.columns.find((c) => c.name === config.columns['start']);
  const endMeta = data.columns.find((c) => c.name === config.columns['end']);
  const timeAxis = startMeta?.type === 'datetime' || startMeta?.type === 'date' || endMeta?.type === 'datetime' || endMeta?.type === 'date';
  const n = Math.min(labels.length, starts.length, ends.length);
  const names: string[] = [];
  const rows: RangeDatum[] = [];
  for (let i = 0; i < n; i++) {
    const start = toRangeNumber(starts[i]);
    const end = toRangeNumber(ends[i]);
    if (labels[i] != null && Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const label = String(labels[i]);
      const index = names.length;
      names.push(label);
      rows.push([start, end, index, label]);
    }
  }
  return { labels: names, rows, timeAxis };
}

function rangeRenderItem(theme: ThemeTokens): CustomSeriesRenderItem {
  return (_params, api) => {
    const start = api.coord([api.value(0), api.value(2)]);
    const end = api.coord([api.value(1), api.value(2)]);
    const rawSize = api.size?.([0, 1]);
    const laneSize = Array.isArray(rawSize) ? rawSize[1] : 14;
    const height = Math.max(8, laneSize * 0.5);
    const index = api.value(2) as number;
    return {
      type: 'rect',
      transition: ['shape'],
      shape: { x: start[0], y: start[1] - height / 2, width: Math.max(1, end[0] - start[0]), height },
      style: {
        fill: categoricalColor(theme.colorScale, index, theme.foreground),
        stroke: theme.background,
        lineWidth: 1,
      },
    };
  };
}

class RangeBarRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return rangeData(data, config).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No ranges to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const ranges = rangeData(data, config);
    const axes = buildCartesianAxes(
      theme,
      ranges.timeAxis ? { type: 'time' } : { type: 'value' },
      { type: 'category', data: ranges.labels, inverse: true, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'custom',
        renderItem: rangeRenderItem(theme),
        data: ranges.rows,
        encode: { x: [0, 1], y: 2, tooltip: [3, 0, 1] },
      }],
      grid: buildGrid({ left: 112, right: 32, top: 24, bottom: 56 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'range_bar',
  family: 'time-series',
  name: 'Range Bar',
  description: 'Labeled start/end intervals rendered as horizontal bars',
  renderer: 'echarts',
  compatibleShapes: ['intervals', 'generic'],
  requiredColumns: [
    { role: 'label', acceptedTypes: ['category', 'text'], label: 'Label' },
    { role: 'start', acceptedTypes: ['datetime', 'date', 'category', 'text', 'numeric', 'integer', 'float'], label: 'Start' },
    { role: 'end', acceptedTypes: ['datetime', 'date', 'category', 'text', 'numeric', 'integer', 'float'], label: 'End' },
  ],
  createRenderer: () => new RangeBarRenderer(),
});
