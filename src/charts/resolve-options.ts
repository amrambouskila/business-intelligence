import type { ChartOptionSpec } from './option-spec';

export type ResolvedOptions = Record<string, number | boolean | string>;

/**
 * Resolve a layer's raw options against a chart's option specs: every spec key
 * gets a value, using the layer's value when present and type-valid, otherwise
 * the spec default. This is the single place defaults are applied, so the UI
 * control and the renderer can never disagree on a default.
 */
export function resolveOptions(specs: ChartOptionSpec[], options: Record<string, unknown>): ResolvedOptions {
  const resolved: ResolvedOptions = {};
  for (const spec of specs) {
    const raw = options[spec.key];
    resolved[spec.key] = isValid(spec, raw) ? (raw as number | boolean | string) : spec.default;
  }
  return resolved;
}

function isValid(spec: ChartOptionSpec, raw: unknown): boolean {
  switch (spec.control) {
    case 'number':
      return typeof raw === 'number' && Number.isFinite(raw);
    case 'toggle':
      return typeof raw === 'boolean';
    case 'select':
      return typeof raw === 'string' && isKnownChoice(spec, raw);
    case 'color':
      return typeof raw === 'string';
  }
}

function isKnownChoice(spec: ChartOptionSpec, value: string): boolean {
  return spec.choices == null || spec.choices.some((choice) => choice.value === value);
}
