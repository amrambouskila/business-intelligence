import type { EChartsOption } from 'echarts';
import type { ThemeTokens } from '@/charts/types';

/** One Cartesian axis: its scale type plus optional category data, name, and styling. */
export interface AxisSpec {
  type: 'value' | 'category' | 'time';
  data?: (string | number)[];
  name?: string;
  nameGap?: number;
  rotate?: number;
  inverse?: boolean;
  /** Override splitLine visibility; defaults to on for value axes, off otherwise. */
  splitLine?: boolean;
  /** Override axisLine visibility; defaults to on. */
  axisLine?: boolean;
}

function buildAxis(theme: ThemeTokens, spec: AxisSpec): Record<string, unknown> {
  const axisLabel: Record<string, unknown> = { color: theme.axisColor, fontSize: theme.fontSize.small };
  if (spec.rotate != null) axisLabel.rotate = spec.rotate;

  const axis: Record<string, unknown> = {
    type: spec.type,
    axisLabel,
  };
  if (spec.axisLine ?? true) {
    axis.axisLine = { lineStyle: { color: theme.gridColor } };
  }
  if (spec.inverse != null) axis.inverse = spec.inverse;
  if (spec.data) axis.data = spec.data;
  if (spec.name != null) {
    axis.name = spec.name;
    axis.nameLocation = 'middle';
    axis.nameGap = spec.nameGap ?? 30;
  }
  if (spec.splitLine ?? spec.type === 'value') {
    axis.splitLine = { lineStyle: { color: theme.gridColor } };
  }
  return axis;
}

/**
 * Build themed x/y Cartesian axes from intent (scale type, category data, name),
 * centralizing the axisLabel/axisLine/splitLine styling that every ECharts chart
 * would otherwise copy-paste from ThemeTokens.
 */
export function buildCartesianAxes(
  theme: ThemeTokens,
  x: AxisSpec,
  y: AxisSpec,
): { xAxis: EChartsOption['xAxis']; yAxis: EChartsOption['yAxis'] } {
  return {
    xAxis: buildAxis(theme, x) as EChartsOption['xAxis'],
    yAxis: buildAxis(theme, y) as EChartsOption['yAxis'],
  };
}
