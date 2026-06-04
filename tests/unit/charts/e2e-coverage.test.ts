import { describe, it, expect, beforeAll } from 'vitest';
import { chartRegistry } from '@/charts/registry';
import { ensureAllFamiliesLoaded } from '@/charts/families';
import { getSampleOptions } from '@/data/sample-data';
import { CHART_SAMPLE } from '../../e2e/chart-samples';

// Guards the visual gate against drift: a new chart can't ship without an e2e
// entry, and no entry may point at a non-existent sample or chart type.
beforeAll(async () => {
  await ensureAllFamiliesLoaded();
});

describe('e2e visual-gate coverage', () => {
  it('maps every registered chart to a sample dataset', () => {
    const unmapped = chartRegistry.all().map((d) => d.type).filter((t) => !(t in CHART_SAMPLE));
    expect(unmapped).toEqual([]);
  });

  it('references only registered chart types and real sample keys', () => {
    const validSamples = new Set(getSampleOptions().map((o) => o.value));
    for (const [chartType, sample] of Object.entries(CHART_SAMPLE)) {
      expect(chartRegistry.get(chartType), chartType).toBeDefined();
      expect(validSamples.has(sample), `${chartType} -> ${sample}`).toBe(true);
    }
  });
});
