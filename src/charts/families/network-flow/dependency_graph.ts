import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface DependencyLink {
  source: string;
  target: string;
  value: number;
}

function dependencyLinks(data: DataView, config: ChartConfig): { nodes: string[]; links: DependencyLink[] } {
  const sources = data.columnArrays[config.columns['source']] ?? [];
  const targets = data.columnArrays[config.columns['target']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(sources.length, targets.length);
  const seen = new Set<string>();
  const nodes: string[] = [];
  const links: DependencyLink[] = [];

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

function dependencyDepths(nodes: string[], links: DependencyLink[]): Map<string, number> {
  const depths = new Map(nodes.map((node) => [node, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    for (const link of links) {
      const nextDepth = depths.get(link.source)! + 1;
      if (nextDepth > depths.get(link.target)!) depths.set(link.target, nextDepth);
    }
  }
  return depths;
}

class DependencyGraphRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return dependencyLinks(data, config).links.length === 0;
  }

  protected emptyMessage(): string {
    return 'No dependencies to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodes, links } = dependencyLinks(data, config);
    const depths = dependencyDepths(nodes, links);
    const maxDepth = Math.max(1, ...depths.values());
    const byDepth = new Map<number, string[]>();
    for (const node of nodes) byDepth.set(depths.get(node)!, [...(byDepth.get(depths.get(node)!) ?? []), node]);

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'graph',
        layout: 'none',
        roam: true,
        data: nodes.map((name, index) => {
          const depth = depths.get(name)!;
          const group = byDepth.get(depth)!;
          const position = group.indexOf(name);
          return {
            name,
            x: (depth / maxDepth) * 100,
            y: group.length === 1 ? 50 : 18 + (position / (group.length - 1)) * 64,
            symbolSize: 22,
            itemStyle: { color: categoricalColor(theme.colorScale, index, theme.foreground) },
            label: { show: true, color: theme.foreground },
          };
        }),
        links: links.map((link) => ({
          ...link,
          lineStyle: { width: Math.max(1, Math.sqrt(Math.max(1, link.value))), opacity: 0.62, curveness: 0.12 },
        })),
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 10,
        lineStyle: { color: theme.gridColor },
      }],
    };
  }
}

chartRegistry.register({
  type: 'dependency_graph',
  family: 'network-flow',
  name: 'Dependency Graph',
  description: 'Directed dependencies arranged by inferred dependency depth',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'nodes_edges', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target' },
  ],
  optionalColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new DependencyGraphRenderer(),
});
