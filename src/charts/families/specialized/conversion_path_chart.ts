import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface PathLink {
  source: string;
  target: string;
  value: number;
}

function pathLinks(data: DataView, config: ChartConfig): PathLink[] {
  const sources = data.columnArrays[config.columns['source']] ?? [];
  const targets = data.columnArrays[config.columns['target']] ?? [];
  const counts = data.columnArrays[config.columns['count']] ?? [];
  const n = Math.min(sources.length, targets.length, counts.length);
  const links: PathLink[] = [];

  for (let i = 0; i < n; i++) {
    const value = counts[i];
    if (sources[i] == null || targets[i] == null || typeof value !== 'number' || !Number.isFinite(value)) continue;
    links.push({ source: String(sources[i]), target: String(targets[i]), value });
  }

  return links;
}

class ConversionPathRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return pathLinks(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No conversion paths to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const links = pathLinks(data, config);
    const nodeNames = [...new Set(links.flatMap((link) => [link.source, link.target]))];

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'sankey',
        nodeGap: 18,
        nodeWidth: 18,
        data: nodeNames.map((name) => ({ name })),
        links,
        label: { color: theme.foreground },
        lineStyle: { color: 'gradient', opacity: 0.55 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'conversion_path_chart',
  family: 'specialized',
  name: 'Conversion Path Chart',
  description: 'Weighted stage-to-stage paths through a conversion flow',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source Stage' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target Stage' },
    { role: 'count', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Count' },
  ],
  createRenderer: () => new ConversionPathRenderer(),
});
