import { describe, it, expect } from 'vitest';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';

const specs: ChartOptionSpec[] = [
  { key: 'bins', label: 'Bins', control: 'number', default: 30, min: 5, max: 200, step: 5 },
  { key: 'smooth', label: 'Smooth', control: 'toggle', default: false },
  { key: 'mode', label: 'Mode', control: 'select', default: 'a', choices: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
  { key: 'tint', label: 'Tint', control: 'color', default: '#000000' },
];

describe('resolveOptions', () => {
  it('fills every spec default when options is empty', () => {
    expect(resolveOptions(specs, {})).toEqual({ bins: 30, smooth: false, mode: 'a', tint: '#000000' });
  });

  it('uses provided values when present and the right type', () => {
    expect(resolveOptions(specs, { bins: 50, smooth: true, mode: 'b', tint: '#ffffff' })).toEqual({
      bins: 50, smooth: true, mode: 'b', tint: '#ffffff',
    });
  });

  it('falls back to default when a number option is the wrong type', () => {
    expect(resolveOptions(specs, { bins: 'oops' }).bins).toBe(30);
  });

  it('falls back to default when a number option is not finite', () => {
    expect(resolveOptions(specs, { bins: NaN }).bins).toBe(30);
  });

  it('falls back to default when a toggle option is the wrong type', () => {
    expect(resolveOptions(specs, { smooth: 'yes' }).smooth).toBe(false);
  });

  it('falls back to default when a select option is the wrong type', () => {
    expect(resolveOptions(specs, { mode: 5 }).mode).toBe('a');
  });

  it('falls back to default when a select option is not one of its choices', () => {
    expect(resolveOptions(specs, { mode: 'c' }).mode).toBe('a');
  });

  it('accepts any string for a select option with no declared choices', () => {
    const mode = resolveOptions(
      [{ key: 'mode', label: 'Mode', control: 'select', default: 'a' }],
      { mode: 'custom' },
    ).mode;
    expect(mode).toBe('custom');
  });

  it('falls back to default when a color option is the wrong type', () => {
    expect(resolveOptions(specs, { tint: 123 }).tint).toBe('#000000');
  });

  it('returns an empty object for no specs', () => {
    expect(resolveOptions([], { anything: 1 })).toEqual({});
  });
});
