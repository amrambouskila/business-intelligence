import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface ChordLink {
  source: string;
  target: string;
  value: number;
  lineStyle: { width: number; opacity: number; curveness: number };
}

function buildChord(data: DataView, config: ChartConfig): { nodeNames: string[]; links: ChordLink[] } {
  const sources = (data.columnArrays[config.columns['source']] ?? []).map(String);
  const targets = (data.columnArrays[config.columns['target']] ?? []).map(String);
  const values = data.columnArrays[config.columns['value']] ?? [];
  const seen = new Set<string>();
  const nodeNames: string[] = [];

  const addNode = (name: string): void => {
    if (!seen.has(name)) {
      seen.add(name);
      nodeNames.push(name);
    }
  };

  const links = sources.map((source, i) => {
    const target = targets[i];
    addNode(source);
    addNode(target);
    const raw = Number(values[i]);
    const value = Number.isFinite(raw) ? Math.max(0, raw) : 1;
    return {
      source,
      target,
      value,
      lineStyle: { width: Math.max(1, Math.sqrt(Math.max(1, value))), opacity: 0.55, curveness: 0.25 },
    };
  });

  return { nodeNames, links };
}

class ChordDiagramRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildChord(data, config).links.length === 0;
  }

  protected emptyMessage(): string {
    return 'No flows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodeNames, links } = buildChord(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'graph',
        layout: 'circular',
        circular: { rotateLabel: true },
        roam: true,
        data: nodeNames.map((name, i) => ({
          name,
          symbolSize: 18,
          itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
          label: { show: true, color: theme.foreground },
        })),
        links,
        lineStyle: { color: 'source', opacity: 0.55 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'chord_diagram',
  family: 'network-flow',
  name: 'Chord Diagram',
  description: 'Circular flow relationships between categories',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new ChordDiagramRenderer(),
});
