import { describe, it, expect } from 'vitest';
import { buildTooltip } from '@/charts/echarts/buildTooltip';

type T = Record<string, unknown>;

describe('buildTooltip', () => {
  it('sets the trigger', () => {
    expect((buildTooltip('item') as T).trigger).toBe('item');
    expect((buildTooltip('axis') as T).trigger).toBe('axis');
  });

  it('merges extra options such as axisPointer', () => {
    const tip = buildTooltip('axis', { axisPointer: { type: 'cross' } }) as T;
    expect(tip.trigger).toBe('axis');
    expect((tip.axisPointer as T).type).toBe('cross');
  });
});
