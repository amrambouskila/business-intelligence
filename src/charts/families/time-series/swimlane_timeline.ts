import type { CustomSeriesRenderItem, EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type SwimlaneDatum = [number, number, number, string, string];

function toTime(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function swimlaneData(data: DataView, config: ChartConfig): { lanes: string[]; rows: SwimlaneDatum[] } {
  const lanes = data.columnArrays[config.columns['lane']] ?? [];
  const tasks = data.columnArrays[config.columns['task']] ?? [];
  const starts = data.columnArrays[config.columns['start']] ?? [];
  const ends = data.columnArrays[config.columns['end']] ?? [];
  const n = Math.min(lanes.length, tasks.length, starts.length, ends.length);
  const laneIndex = new Map<string, number>();
  const laneLabels: string[] = [];
  const rows: SwimlaneDatum[] = [];
  for (let i = 0; i < n; i++) {
    const start = toTime(starts[i]);
    const end = toTime(ends[i]);
    if (lanes[i] != null && tasks[i] != null && Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const lane = String(lanes[i]);
      if (!laneIndex.has(lane)) {
        laneIndex.set(lane, laneLabels.length);
        laneLabels.push(lane);
      }
      rows.push([start, end, laneIndex.get(lane) as number, String(tasks[i]), lane]);
    }
  }
  return { lanes: laneLabels, rows };
}

function laneRenderItem(theme: ThemeTokens): CustomSeriesRenderItem {
  return (_params, api) => {
    const start = api.coord([api.value(0), api.value(2)]);
    const end = api.coord([api.value(1), api.value(2)]);
    const rawSize = api.size?.([0, 1]);
    const laneSize = Array.isArray(rawSize) ? rawSize[1] : 14;
    const height = Math.max(8, laneSize * 0.42);
    const laneIndex = api.value(2) as number;
    return {
      type: 'rect',
      transition: ['shape'],
      shape: { x: start[0], y: start[1] - height / 2, width: Math.max(1, end[0] - start[0]), height },
      style: {
        fill: categoricalColor(theme.colorScale, laneIndex, theme.foreground),
        stroke: theme.background,
        lineWidth: 1,
      },
    };
  };
}

class SwimlaneTimelineRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return swimlaneData(data, config).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No swimlane intervals to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = swimlaneData(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'time' },
      { type: 'category', data: rows.lanes, inverse: true, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'custom',
        renderItem: laneRenderItem(theme),
        data: rows.rows,
        encode: { x: [0, 1], y: 2, tooltip: [4, 3, 0, 1] },
      }],
      grid: buildGrid({ left: 112, right: 32, top: 24, bottom: 56 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'swimlane_timeline',
  family: 'time-series',
  name: 'Swimlane Timeline',
  description: 'Intervals grouped into categorical lanes over time',
  renderer: 'echarts',
  compatibleShapes: ['intervals', 'generic'],
  requiredColumns: [
    { role: 'lane', acceptedTypes: ['category', 'text'], label: 'Lane' },
    { role: 'task', acceptedTypes: ['category', 'text'], label: 'Task' },
    { role: 'start', acceptedTypes: ['datetime', 'date', 'category', 'text', 'numeric', 'integer', 'float'], label: 'Start' },
    { role: 'end', acceptedTypes: ['datetime', 'date', 'category', 'text', 'numeric', 'integer', 'float'], label: 'End' },
  ],
  createRenderer: () => new SwimlaneTimelineRenderer(),
});
