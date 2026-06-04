import type { CustomSeriesRenderItem, EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type IntervalDatum = [number, number, number, string];

function toTime(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function ganttData(data: DataView, config: ChartConfig): { tasks: string[]; rows: IntervalDatum[] } {
  const tasks = data.columnArrays[config.columns['task']] ?? [];
  const starts = data.columnArrays[config.columns['start']] ?? [];
  const ends = data.columnArrays[config.columns['end']] ?? [];
  const n = Math.min(tasks.length, starts.length, ends.length);
  const labels: string[] = [];
  const rows: IntervalDatum[] = [];
  for (let i = 0; i < n; i++) {
    const start = toTime(starts[i]);
    const end = toTime(ends[i]);
    if (tasks[i] != null && Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const task = String(tasks[i]);
      const taskIndex = labels.length;
      labels.push(task);
      rows.push([start, end, taskIndex, task]);
    }
  }
  return { tasks: labels, rows };
}

function intervalRenderItem(theme: ThemeTokens): CustomSeriesRenderItem {
  return (_params, api) => {
    const start = api.coord([api.value(0), api.value(2)]);
    const end = api.coord([api.value(1), api.value(2)]);
    const rawSize = api.size?.([0, 1]);
    const laneSize = Array.isArray(rawSize) ? rawSize[1] : 14;
    const height = Math.max(8, laneSize * 0.56);
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

class GanttChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return ganttData(data, config).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No task intervals to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = ganttData(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'time' },
      { type: 'category', data: rows.tasks, inverse: true, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'custom',
        renderItem: intervalRenderItem(theme),
        data: rows.rows,
        encode: { x: [0, 1], y: 2, tooltip: [3, 0, 1] },
      }],
      grid: buildGrid({ left: 128, right: 32, top: 24, bottom: 56 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'gantt_chart',
  family: 'time-series',
  name: 'Gantt Chart',
  description: 'Task intervals rendered along a project timeline',
  renderer: 'echarts',
  compatibleShapes: ['intervals', 'generic'],
  requiredColumns: [
    { role: 'task', acceptedTypes: ['category', 'text'], label: 'Task' },
    { role: 'start', acceptedTypes: ['datetime', 'date', 'category', 'text', 'numeric', 'integer', 'float'], label: 'Start' },
    { role: 'end', acceptedTypes: ['datetime', 'date', 'category', 'text', 'numeric', 'integer', 'float'], label: 'End' },
  ],
  createRenderer: () => new GanttChartRenderer(),
});
