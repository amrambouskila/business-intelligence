import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface SequenceEvent {
  order: number;
  actor: string;
  action: string;
  targetActor: string;
}

function sequenceEvents(data: DataView, config: ChartConfig): SequenceEvent[] {
  const orders = data.columnArrays[config.columns['order']] ?? [];
  const actors = data.columnArrays[config.columns['actor']] ?? [];
  const actions = data.columnArrays[config.columns['action']] ?? [];
  const targets = data.columnArrays[config.columns['target_actor']] ?? [];
  const n = Math.min(orders.length, actors.length, actions.length, targets.length);
  const out: SequenceEvent[] = [];

  for (let i = 0; i < n; i++) {
    const order = orders[i];
    if (
      typeof order !== 'number'
      || !Number.isFinite(order)
      || actors[i] == null
      || actions[i] == null
      || targets[i] == null
    ) continue;
    out.push({
      order,
      actor: String(actors[i]),
      action: String(actions[i]),
      targetActor: String(targets[i]),
    });
  }

  return out.sort((a, b) => a.order - b.order);
}

function actorLanes(events: SequenceEvent[]): string[] {
  const lanes: string[] = [];
  for (const event of events) {
    if (!lanes.includes(event.actor)) lanes.push(event.actor);
    if (!lanes.includes(event.targetActor)) lanes.push(event.targetActor);
  }
  return lanes;
}

class SequenceDiagramRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return sequenceEvents(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No sequence events to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const events = sequenceEvents(data, config);
    const lanes = actorLanes(events);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: lanes },
      { type: 'value', name: 'Step', inverse: true, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item', {
        formatter: (params: unknown) => {
          const name = (params as { seriesName?: string }).seriesName;
          const data = (params as { data?: unknown[] }).data;
          return name && data ? `${name}<br/>${data[0]} -> ${data[2]}<br/>Step ${data[1]}` : '';
        },
      }),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 1, max: events[events.length - 1].order, interval: 1 },
      grid: buildGrid({ left: 72, bottom: 56 }),
      series: events.map((event, index) => ({
        name: event.action,
        type: 'line',
        data: [[event.actor, event.order, event.targetActor], [event.targetActor, event.order, event.targetActor]],
        symbol: 'arrow',
        symbolSize: 12,
        lineStyle: { width: 3, color: categoricalColor(theme.colorScale, index, theme.foreground) },
        itemStyle: { color: categoricalColor(theme.colorScale, index, theme.foreground) },
        label: { show: true, formatter: event.action, color: theme.foreground, fontFamily: theme.fontFamily },
      })),
    };
  }
}

chartRegistry.register({
  type: 'sequence_diagram',
  family: 'specialized',
  name: 'Sequence Diagram',
  description: 'Ordered actor-to-actor interactions connected by action lines',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'order', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Order' },
    { role: 'actor', acceptedTypes: ['category', 'text'], label: 'Actor' },
    { role: 'action', acceptedTypes: ['category', 'text'], label: 'Action' },
    { role: 'target_actor', acceptedTypes: ['category', 'text'], label: 'Target actor' },
  ],
  createRenderer: () => new SequenceDiagramRenderer(),
});
