import type { EChartsOption, GridComponentOption } from 'echarts';

type Grid = NonNullable<EChartsOption['grid']>;

/** Themed default plot margins, with per-chart overrides merged on top. */
export function buildGrid(overrides: Partial<GridComponentOption> = {}): Grid {
  return { left: 60, right: 20, top: 20, bottom: 40, ...overrides } as Grid;
}
