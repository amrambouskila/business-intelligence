import type { EChartsOption, TooltipComponentOption } from 'echarts';

type Tooltip = NonNullable<EChartsOption['tooltip']>;

/** Themed tooltip with a trigger and optional extras (e.g. axisPointer). */
export function buildTooltip(trigger: 'item' | 'axis', extra: Partial<TooltipComponentOption> = {}): Tooltip {
  return { trigger, ...extra } as Tooltip;
}
