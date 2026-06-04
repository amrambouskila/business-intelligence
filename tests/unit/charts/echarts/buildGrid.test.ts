import { describe, it, expect } from 'vitest';
import { buildGrid } from '@/charts/echarts/buildGrid';

describe('buildGrid', () => {
  it('returns sensible default margins', () => {
    expect(buildGrid()).toEqual({ left: 60, right: 20, top: 20, bottom: 40 });
  });

  it('merges overrides over the defaults', () => {
    expect(buildGrid({ bottom: 60 })).toEqual({ left: 60, right: 20, top: 20, bottom: 60 });
  });
});
