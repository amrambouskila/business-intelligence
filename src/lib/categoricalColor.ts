/**
 * Pick a categorical color by series index, cycling the palette. Falls back to
 * `fallback` when the palette is empty so a chart never renders with `undefined`.
 */
export function categoricalColor(palette: string[], index: number, fallback: string): string {
  if (palette.length === 0) return fallback;
  return palette[index % palette.length];
}
