import { describe, it, expect } from 'vitest';
import { survivalCurve } from '@/data/stats/survival';

describe('survivalCurve', () => {
  it('computes Kaplan-Meier survival and Nelson-Aalen cumulative hazard', () => {
    const points = survivalCurve([
      { time: 3, event: true },
      { time: 1, event: true },
      { time: 2, event: false },
      { time: 3, event: false },
    ]);

    expect(points.map((point) => point.time)).toEqual([1, 2, 3]);
    expect(points[0]).toMatchObject({ atRisk: 4, events: 1, censored: 0 });
    expect(points[0].survival).toBeCloseTo(0.75, 10);
    expect(points[0].cumulativeHazard).toBeCloseTo(0.25, 10);
    expect(points[1]).toMatchObject({ atRisk: 3, events: 0, censored: 1 });
    expect(points[1].survival).toBeCloseTo(0.75, 10);
    expect(points[2]).toMatchObject({ atRisk: 2, events: 1, censored: 1 });
    expect(points[2].survival).toBeCloseTo(0.375, 10);
    expect(points[2].cumulativeHazard).toBeCloseTo(0.75, 10);
  });

  it('drops negative and non-finite times', () => {
    expect(survivalCurve([
      { time: -1, event: true },
      { time: Number.NaN, event: true },
      { time: 2, event: false },
    ])).toEqual([
      { time: 2, atRisk: 1, events: 0, censored: 1, survival: 1, cumulativeHazard: 0 },
    ]);
  });

  it('returns [] for empty input', () => {
    expect(survivalCurve([])).toEqual([]);
  });
});
