import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface AlluvialLink {
  source: string;
  target: string;
  value: number;
}

function buildAlluvial(data: DataView, config: ChartConfig): { nodes: Array<{ name: string }>; links: AlluvialLink[] } {
  const stage1 = data.columnArrays[config.columns['stage1']] ?? [];
  const stage2 = data.columnArrays[config.columns['stage2']] ?? [];
  const stage3 = data.columnArrays[config.columns['stage3']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const names = new Set<string>();
  const linksByKey = new Map<string, AlluvialLink>();

  const addLink = (source: string, target: string, value: number): void => {
    names.add(source);
    names.add(target);
    const key = `${source}\u0000${target}`;
    const existing = linksByKey.get(key);
    if (existing) existing.value += value;
    else linksByKey.set(key, { source, target, value });
  };

  for (let i = 0; i < stage1.length; i++) {
    const raw = values[i];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const first = String(stage1[i]);
    const second = String(stage2[i]);
    const third = String(stage3[i]);
    addLink(first, second, raw);
    addLink(second, third, raw);
  }

  return {
    nodes: Array.from(names).map((name) => ({ name })),
    links: Array.from(linksByKey.values()),
  };
}

class AlluvialDiagramRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildAlluvial(data, config).links.length === 0;
  }

  protected emptyMessage(): string {
    return 'No paths to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodes, links } = buildAlluvial(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'sankey',
        data: nodes,
        links,
        nodeAlign: 'justify',
        emphasis: { focus: 'adjacency' },
        label: { color: theme.foreground },
        lineStyle: { color: 'gradient', opacity: 0.45 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'alluvial_diagram',
  family: 'network-flow',
  name: 'Alluvial Diagram',
  description: 'Multi-step categorical flows across sequential stages',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'stage1', acceptedTypes: ['category', 'text'], label: 'Stage 1' },
    { role: 'stage2', acceptedTypes: ['category', 'text'], label: 'Stage 2' },
    { role: 'stage3', acceptedTypes: ['category', 'text'], label: 'Stage 3' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new AlluvialDiagramRenderer(),
});
