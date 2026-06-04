import { describe, it, expect, beforeAll, vi } from 'vitest';

// deck.gl pulls in WebGL at import time; stub it so the instanceof check below
// can import DeckGLBaseRenderer without a real GL context.
vi.mock('@deck.gl/react', () => ({ default: () => null }));

import { chartRegistry } from '@/charts/registry';
import { FAMILY_META } from '@/charts/types';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { DeckGLBaseRenderer } from '@/charts/renderers/deckgl-renderer';
import { Canvas2DBaseRenderer } from '@/charts/renderers/canvas2d-renderer';
import { ReglBaseRenderer } from '@/charts/renderers/regl-renderer';
import { ensureAllFamiliesLoaded } from '@/charts/families';
import type { DataShape } from '@/types/data';

const VALID_SHAPES: ReadonlySet<DataShape> = new Set<DataShape>([
  'single_numeric', 'category_numeric', 'time_numeric', 'time_series_numeric',
  'two_numeric', 'three_numeric', 'many_numeric', 'matrix', 'hierarchy',
  'nodes_edges', 'source_target_value', 'geo_points', 'geo_polygons',
  'intervals', 'ohlcv', 'survival', 'event_log', 'generic',
]);

beforeAll(async () => {
  await ensureAllFamiliesLoaded();
}, 60_000);

describe('chart registry contract', () => {
  it('registers at least the implemented charts', () => {
    expect(chartRegistry.count).toBeGreaterThanOrEqual(3);
  });

  // One it() body (not it.each) so the loop runs in the execution phase AFTER
  // beforeAll has loaded every family — it.each snapshots the table at collection
  // time, before the lazy families register, and would silently validate only the
  // eager charts as the catalog grows.
  it('every registered chart satisfies the ChartDefinition contract', () => {
    const all = chartRegistry.all();
    expect(all.length).toBeGreaterThan(0);
    for (const def of all) {
      expect(def.type.length, def.type).toBeGreaterThan(0);
      expect(def.name.length, def.type).toBeGreaterThan(0);
      expect(FAMILY_META[def.family], def.type).toBeDefined();
      expect(def.compatibleShapes.length, def.type).toBeGreaterThan(0);
      for (const shape of def.compatibleShapes) {
        expect(VALID_SHAPES.has(shape), `${def.type}: ${shape}`).toBe(true);
      }
      for (const role of def.requiredColumns) {
        expect(role.role.length, def.type).toBeGreaterThan(0);
        expect(role.label.length, def.type).toBeGreaterThan(0);
        expect(role.acceptedTypes.length, def.type).toBeGreaterThan(0);
      }
      const renderer = def.createRenderer();
      expect(typeof renderer.render, def.type).toBe('function');
      if (def.renderer === 'echarts') {
        expect(renderer, def.type).toBeInstanceOf(EChartsBaseRenderer);
      } else if (def.renderer === 'deckgl') {
        expect(renderer, def.type).toBeInstanceOf(DeckGLBaseRenderer);
      } else if (def.renderer === 'canvas2d') {
        expect(renderer, def.type).toBeInstanceOf(Canvas2DBaseRenderer);
      } else if (def.renderer === 'regl') {
        expect(renderer, def.type).toBeInstanceOf(ReglBaseRenderer);
      }
      for (const spec of def.options ?? []) {
        expect(spec.key.length, def.type).toBeGreaterThan(0);
        expect(spec.label.length, def.type).toBeGreaterThan(0);
        expect(['number', 'toggle', 'select', 'color'], def.type).toContain(spec.control);
      }
    }
  });
});
