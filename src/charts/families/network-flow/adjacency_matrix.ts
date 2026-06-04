import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface MatrixCell {
  source: string;
  target: string;
  value: number;
}

function adjacencyCells(data: DataView, config: ChartConfig): { nodes: string[]; cells: MatrixCell[] } {
  const sources = data.columnArrays[config.columns['source']] ?? [];
  const targets = data.columnArrays[config.columns['target']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(sources.length, targets.length);
  const seen = new Set<string>();
  const nodes: string[] = [];
  const cellMap = new Map<string, MatrixCell>();

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
    const value = Number.isFinite(raw) ? Math.max(0, raw) : 1;
    addNode(source);
    addNode(target);
    const key = `${source}\u0000${target}`;
    const existing = cellMap.get(key);
    cellMap.set(key, { source, target, value: (existing?.value ?? 0) + value });
  }

  return { nodes, cells: [...cellMap.values()] };
}

class AdjacencyMatrixRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return adjacencyCells(data, config).cells.length === 0;
  }

  protected emptyMessage(): string {
    return 'No adjacency edges to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { nodes, cells } = adjacencyCells(data, config);
    const nodeIndex = new Map(nodes.map((node, index) => [node, index]));
    const values = cells.map((cell) => cell.value);
    const max = Math.max(1, ...values);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: nodes, rotate: nodes.length > 8 ? 35 : undefined },
      { type: 'category', data: nodes, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item', {
        formatter: (params: unknown) => {
          const row = (params as { data?: unknown }).data as [number, number, number, string, string] | undefined;
          return row ? `${row[3]} -> ${row[4]}: ${row[2]}` : '';
        },
      }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      grid: buildGrid({ left: 96, bottom: 72 }),
      visualMap: {
        min: 0,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 12,
        inRange: { color: theme.sequentialScale },
        textStyle: { color: theme.foreground },
      },
      series: [{
        type: 'heatmap',
        data: cells.map((cell) => [nodeIndex.get(cell.target)!, nodeIndex.get(cell.source)!, cell.value, cell.source, cell.target]),
        label: { show: nodes.length <= 7, color: theme.foreground },
        emphasis: { itemStyle: { borderColor: theme.foreground, borderWidth: 1 } },
      }],
    };
  }
}

chartRegistry.register({
  type: 'adjacency_matrix',
  family: 'network-flow',
  name: 'Adjacency Matrix',
  description: 'Directed edge weights encoded as a source-by-target matrix',
  renderer: 'echarts',
  compatibleShapes: ['source_target_value', 'matrix', 'nodes_edges', 'generic'],
  requiredColumns: [
    { role: 'source', acceptedTypes: ['category', 'text'], label: 'Source' },
    { role: 'target', acceptedTypes: ['category', 'text'], label: 'Target' },
  ],
  optionalColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new AdjacencyMatrixRenderer(),
});
