import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface ArcNode {
  name: string;
  x: number;
  y: number;
  symbolSize: number;
  itemStyle: { color: string };
  label: { show: boolean; color: string };
}

interface ArcLink {
  source: string;
  target: string;
  value: number;
  lineStyle: { width: number; curveness: number; opacity: number };
}

function buildArcGraph(data: DataView, config: ChartConfig): { nodes: ArcNode[]; links: ArcLink[] } {
  const sources = (data.columnArrays[config.columns['source']] ?? []).map(String);
  const targets = (data.columnArrays[config.columns['target']] ?? []).map(String);
  const values = data.columnArrays[config.columns['value']] ?? [];
  const seen = new Set<string>();
  const names: string[] = [];

  const addName = (name: string): void => {
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  };

  const rawLinks = sources.map((source, i) => {
    const target = targets[i];
    addName(source);
    addName(target);
    const raw = Number(values[i]);
    return { source, target, value: Number.isFinite(raw) ? Math.max(0, raw) : 1 };
  });

  const nodeWeights = new Map(names.map((name) => [name, 0]));
  for (const link of rawLinks) {
    nodeWeights.set(link.source, nodeWeights.get(link.source)! + link.value);
    nodeWeights.set(link.target, nodeWeights.get(link.target)! + link.value);
  }

  const maxWeight = Math.max(1, ...Array.from(nodeWeights.values()));
  const nodes = names.map((name, i) => ({
    name,
    x: names.length === 1 ? 50 : (i / (names.length - 1)) * 100,
    y: 50,
    symbolSize: 12 + (nodeWeights.get(name)! / maxWeight) * 24,
    itemStyle: { color: categoricalColor([], i, '') },
    label: { show: true, color: '' },
  }));
  const links = rawLinks.map((link) => ({
    ...link,
    lineStyle: {
      width: Math.max(1, Math.sqrt(Math.max(1, link.value))),
      curveness: link.source === link.target ? 0.5 : 0.35,
      opacity: 0.65,
    },
  }));

  return { nodes, links };
}

class ArcDiagramRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildArcGraph(data, config).links.length === 0;
  }

  protected emptyMessage(): string {
    return 'No edges to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodes, links } = buildArcGraph(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'graph',
        layout: 'none',
        coordinateSystem: undefined,
        roam: false,
        data: nodes.map((node, i) => ({
          ...node,
          itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
          label: { show: true, color: theme.foreground },
        })),
        links,
        lineStyle: { color: theme.gridColor },
        edgeSymbol: ['none', 'none'],
      }],
    };
  }
}

chartRegistry.register({
  type: 'arc_diagram',
  family: 'network-flow',
  name: 'Arc Diagram',
  description: 'Ordered nodes connected by weighted curved arcs',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'nodes_edges', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target' },
  ],
  optionalColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new ArcDiagramRenderer(),
});
