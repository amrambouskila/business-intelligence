import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface IcePoint {
  entity: string;
  featureValue: number;
  predicted: number;
}

function icePoints(data: DataView, config: ChartConfig): IcePoint[] {
  const entities = data.columnArrays[config.columns['entity']] ?? [];
  const featureValues = data.columnArrays[config.columns['feature_value']] ?? [];
  const predictions = data.columnArrays[config.columns['predicted']] ?? [];
  const n = Math.min(entities.length, featureValues.length, predictions.length);
  const points: IcePoint[] = [];

  for (let i = 0; i < n; i++) {
    const featureValue = featureValues[i];
    const predicted = predictions[i];
    if (typeof featureValue === 'number' && Number.isFinite(featureValue)
      && typeof predicted === 'number' && Number.isFinite(predicted)) {
      points.push({ entity: String(entities[i]), featureValue, predicted });
    }
  }

  return points;
}

function seriesByEntity(points: IcePoint[], theme: ThemeTokens): NonNullable<EChartsOption['series']> {
  const groups = new Map<string, IcePoint[]>();
  for (const point of points) {
    const group = groups.get(point.entity) ?? [];
    group.push(point);
    groups.set(point.entity, group);
  }

  return Array.from(groups.entries()).map(([entity, rows], index) => {
    const color = categoricalColor(theme.colorScale, index, theme.foreground);
    return {
      name: entity,
      type: 'line',
      data: rows
        .sort((a, b) => a.featureValue - b.featureValue)
        .map((row) => [row.featureValue, row.predicted]),
      showSymbol: false,
      lineStyle: { color, width: 1.5, opacity: 0.45 },
      emphasis: { lineStyle: { width: 3, opacity: 0.9 } },
    };
  }) as NonNullable<EChartsOption['series']>;
}

class IcePlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return icePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No ICE curves to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = icePoints(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['feature_value'], nameGap: 34 },
      { type: 'value', name: 'Predicted', axisLine: false, nameGap: 42 },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: seriesByEntity(points, theme),
      grid: buildGrid({ bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'ice_plot',
  family: 'statistical',
  name: 'ICE Plot',
  description: 'Individual conditional expectation curves by entity',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'entity', acceptedTypes: ['category', 'text'], label: 'Entity' },
    { role: 'feature_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature value' },
    { role: 'predicted', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Predicted value' },
  ],
  createRenderer: () => new IcePlotRenderer(),
});
