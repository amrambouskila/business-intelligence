import { describe, it, expect } from 'vitest';
import { categoricalColor } from '@/lib/categoricalColor';

describe('categoricalColor', () => {
  const palette = ['#f00', '#0f0', '#00f'];

  it('returns the color at the given index', () => {
    expect(categoricalColor(palette, 1, '#fff')).toBe('#0f0');
  });

  it('wraps around when the index exceeds the palette length', () => {
    expect(categoricalColor(palette, 3, '#fff')).toBe('#f00');
    expect(categoricalColor(palette, 4, '#fff')).toBe('#0f0');
  });

  it('falls back to the fallback color for an empty palette', () => {
    expect(categoricalColor([], 0, '#abcabc')).toBe('#abcabc');
  });
});
