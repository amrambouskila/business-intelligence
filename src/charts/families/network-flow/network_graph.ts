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

function networkEdges(data: DataView, config: ChartConfig): { nodes: string[]; links: GraphLink[] } {
  const sources = data.columnArrays[config.columns['source']] ?? [];
  const targets = data.columnArrays[config.columns['target']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(sources.length, targets.length);
  const seen = new Set<string>();
  const nodes: string[] = [];
  const links: GraphLink[] = [];

  const addNode = (name: string): void => {
    if (!seen.has(name)) {
      seen.add(name);
      nodes.push(name);
    }
  };

  for (let i = 0; i < n; i++) {
    if (sources[i] == null || targets[i] == null) continue;
    const source = String(sources[i]);
    const target = String(targets[i]);
    const raw = Number(values[i]);
    addNode(source);
    addNode(target);
    links.push({ source, target, value: Number.isFinite(raw) ? Math.max(0, raw) : 1 });
  }

  return { nodes, links };
}

class NetworkGraphRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return networkEdges(data, config).links.length === 0;
  }

  protected emptyMessage(): string {
    return 'No network edges to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodes, links } = networkEdges(data, config);
    const degree = new Map(nodes.map((node) => [node, 0]));
    for (const link of links) {
      degree.set(link.source, degree.get(link.source)! + link.value);
      degree.set(link.target, degree.get(link.target)! + link.value);
    }
    const maxDegree = Math.max(1, ...degree.values());

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'graph',
        layout: 'circular',
        circular: { rotateLabel: true },
        roam: true,
        data: nodes.map((name, index) => ({
          name,
          symbolSize: 14 + (degree.get(name)! / maxDegree) * 22,
          itemStyle: { color: categoricalColor(theme.colorScale, index, theme.foreground) },
          label: { show: true, color: theme.foreground },
        })),
        links: links.map((link) => ({
          ...link,
          lineStyle: { width: Math.max(1, Math.sqrt(Math.max(1, link.value))), opacity: 0.55 },
        })),
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 8,
        lineStyle: { color: 'source', curveness: 0.18 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'network_graph',
  family: 'network-flow',
  name: 'Network Graph',
  description: 'Directed network nodes and weighted edges in a deterministic circular layout',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'nodes_edges', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target' },
  ],
  optionalColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new NetworkGraphRenderer(),
});
