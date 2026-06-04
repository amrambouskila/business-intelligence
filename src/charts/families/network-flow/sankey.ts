import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

/** Source/target node names (union, first-seen order) plus their value-weighted links. */
function buildGraph(data: DataView, config: ChartConfig): { nodeNames: string[]; links: SankeyLink[] } {
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

  const links: SankeyLink[] = sources.map((source, i) => {
    const target = targets[i];
    addNode(source);
    addNode(target);
    const raw = Number(values[i]);
    return { source, target, value: Number.isFinite(raw) ? raw : 0 };
  });

  return { nodeNames, links };
}

class SankeyRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildGraph(data, config).links.length === 0;
  }

  protected emptyMessage(): string {
    return 'No flows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodeNames, links } = buildGraph(data, config);

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'sankey',
        data: nodeNames.map((name) => ({ name })),
        links,
        label: { color: theme.foreground },
        lineStyle: { color: 'gradient', opacity: 0.5 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'sankey',
  family: 'network-flow',
  name: 'Sankey Diagram',
  description: 'Weighted flow between source and target nodes',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new SankeyRenderer(),
});
