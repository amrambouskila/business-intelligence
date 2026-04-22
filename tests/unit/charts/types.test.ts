import { describe, it, expect } from 'vitest';
import { FAMILY_META } from '@/charts/types';
import type { ChartFamily } from '@/charts/types';

const ALL_FAMILIES: ChartFamily[] = [
  'distribution', 'categorical', 'time-series', 'relationships',
  'matrix', 'hierarchical', 'network-flow', 'geographic',
  'finance', 'statistical', 'composition', 'specialized', '3d',
];

describe('FAMILY_META', () => {
  it('has an entry for each of the 13 families', () => {
    expect(Object.keys(FAMILY_META)).toHaveLength(13);
    for (const fam of ALL_FAMILIES) {
      expect(FAMILY_META[fam]).toBeDefined();
      expect(FAMILY_META[fam].label.length).toBeGreaterThan(0);
      expect(FAMILY_META[fam].icon.length).toBeGreaterThan(0);
    }
  });
});
