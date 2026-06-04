import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

/** Source/target node names (union, first-seen order) plus their value-weighted links. */
function buildGraph(data: DataView, config: ChartConfig): { nodeNames: string[]; links: GraphLink[] } {
  const sourceCol = config.columns['source'];
  const targetCol = config.columns['target'];
  const valueCol = config.columns['value'];
  const sources = (data.columnArrays[sourceCol] ?? []).map(String);
  const targets = (data.columnArrays[targetCol] ?? []).map(String);
  const values = data.columnArrays[valueCol] ?? [];

  const seen = new Set<string>();
  const nodeNames: string[] = [];
  const addNode = (name: string): void => {
    if (!seen.has(name)) {
      seen.add(name);
      nodeNames.push(name);
    }
  };

  const links: GraphLink[] = sources.map((source, i) => {
    const target = targets[i];
    addNode(source);
    addNode(target);
    const raw = Number(values[i]);
    return { source, target, value: Number.isFinite(raw) ? raw : 1 };
  });

  return { nodeNames, links };
}

class ForceDirectedGraphRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildGraph(data, config).links.length === 0;
  }

  protected emptyMessage(): string {
    return 'No edges to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodeNames, links } = buildGraph(data, config);

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        force: { repulsion: 120, edgeLength: 80 },
        data: nodeNames.map((name, i) => ({
          name,
          itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
        })),
        links,
        label: { show: true, color: theme.foreground },
        lineStyle: { color: theme.gridColor, opacity: 0.6 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'force_directed_graph',
  family: 'network-flow',
  name: 'Force-Directed Graph',
  description: 'Nodes and weighted edges laid out by a force simulation',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'nodes_edges', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target' },
  ],
  optionalColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new ForceDirectedGraphRenderer(),
});
