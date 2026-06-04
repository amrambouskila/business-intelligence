import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildHierarchy, type TreeNode } from '@/data/stats/buildHierarchy';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface GraphNode {
  name: string;
  symbolSize: number;
}

interface GraphLink {
  source: string;
  target: string;
}

function flattenHierarchy(tree: TreeNode[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const visit = (node: TreeNode, parent?: string): void => {
    nodes.push({ name: node.name, symbolSize: Math.max(8, Math.sqrt(Math.max(1, node.value)) * 4) });
    if (parent !== undefined) links.push({ source: parent, target: node.name });
    for (const child of node.children ?? []) visit(child, node.name);
  };
  for (const root of tree) visit(root);
  return { nodes, links };
}

class CirclePackingRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const graph = flattenHierarchy(this.buildTree(data, config));
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'graph',
        layout: 'circular',
        data: graph.nodes,
        links: graph.links,
        roam: false,
        label: { show: true, color: theme.foreground },
        lineStyle: { color: theme.gridColor, width: 1.5 },
        itemStyle: { color: theme.colorScale[0] },
      }],
    };
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return this.buildTree(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No hierarchy to chart';
  }

  private buildTree(data: DataView, config: ChartConfig) {
    return buildHierarchy(
      data.columnArrays[config.columns['id']] ?? [],
      data.columnArrays[config.columns['parent']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
  }
}

chartRegistry.register({
  type: 'circle_packing',
  family: 'hierarchical',
  name: 'Circle Packing',
  description: 'Nested hierarchy approximated as packed circles from id/parent/value links',
  renderer: 'echarts',
  compatibleShapes: ['hierarchy', 'generic'],
  requiredColumns: [
    { role: 'id', acceptedTypes: ['category', 'text', 'integer'], label: 'Node ID' },
    { role: 'parent', acceptedTypes: ['category', 'text', 'integer'], label: 'Parent ID' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CirclePackingRenderer(),
});
