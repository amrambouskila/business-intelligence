import { describe, it, expect } from 'vitest';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import type { ThemeTokens } from '@/charts/types';

function theme(): ThemeTokens {
  return {
    mode: 'dark', background: '#000', foreground: '#fff',
    gridColor: '#333', axisColor: '#666',
    colorScale: ['#f00'], sequentialScale: ['#000', '#fff'], divergingScale: ['#f00', '#fff', '#0f0'],
    fontFamily: 'Arial', fontSize: { small: 10, medium: 12, large: 14 },
  };
}

type Axis = Record<string, unknown>;

describe('buildCartesianAxes', () => {
  it('themes a value axis with axisLabel, axisLine, and splitLine by default', () => {
    const { xAxis } = buildCartesianAxes(theme(), { type: 'value' }, { type: 'value' });
    const x = xAxis as Axis;
    expect(x.type).toBe('value');
    expect((x.axisLabel as Axis).color).toBe('#666');
    expect((x.axisLabel as Axis).fontSize).toBe(10);
    expect(((x.axisLine as Axis).lineStyle as Axis).color).toBe('#333');
    expect(((x.splitLine as Axis).lineStyle as Axis).color).toBe('#333');
  });

  it('carries category data and a label rotation, and omits splitLine by default for non-value axes', () => {
    const { xAxis } = buildCartesianAxes(theme(), { type: 'category', data: ['a', 'b'], rotate: 45 }, { type: 'value' });
    const x = xAxis as Axis;
    expect(x.type).toBe('category');
    expect(x.data).toEqual(['a', 'b']);
    expect((x.axisLabel as Axis).rotate).toBe(45);
    expect(x.splitLine).toBeUndefined();
  });

  it('sets an axis name with default nameGap', () => {
    const { yAxis } = buildCartesianAxes(theme(), { type: 'value' }, { type: 'value', name: 'Y' });
    const y = yAxis as Axis;
    expect(y.name).toBe('Y');
    expect(y.nameLocation).toBe('middle');
    expect(y.nameGap).toBe(30);
  });

  it('respects an explicit nameGap', () => {
    const { xAxis } = buildCartesianAxes(theme(), { type: 'value', name: 'X', nameGap: 50 }, { type: 'value' });
    expect((xAxis as Axis).nameGap).toBe(50);
  });

  it('carries an explicit inverse axis flag', () => {
    const { yAxis } = buildCartesianAxes(theme(), { type: 'value' }, { type: 'category', data: ['b', 'a'], inverse: true });
    expect((yAxis as Axis).inverse).toBe(true);
  });

  it('lets splitLine be forced off on a value axis and on for a category axis', () => {
    const off = buildCartesianAxes(theme(), { type: 'value', splitLine: false }, { type: 'value' });
    expect((off.xAxis as Axis).splitLine).toBeUndefined();
    const on = buildCartesianAxes(theme(), { type: 'category', splitLine: true }, { type: 'value' });
    expect((on.xAxis as Axis).splitLine).toBeDefined();
  });

  it('omits axisLine when axisLine is false (defaults to present)', () => {
    const def = buildCartesianAxes(theme(), { type: 'value' }, { type: 'value' });
    expect((def.yAxis as Axis).axisLine).toBeDefined();
    const off = buildCartesianAxes(theme(), { type: 'value' }, { type: 'value', axisLine: false });
    expect((off.yAxis as Axis).axisLine).toBeUndefined();
  });
});
