export interface SurvivalObservation {
  time: number;
  event: boolean;
}

export interface SurvivalPoint {
  time: number;
  atRisk: number;
  events: number;
  censored: number;
  survival: number;
  cumulativeHazard: number;
}

/** Kaplan-Meier survival and Nelson-Aalen cumulative hazard by event time. */
export function survivalCurve(observations: SurvivalObservation[]): SurvivalPoint[] {
  const rows = observations
    .filter((row) => Number.isFinite(row.time) && row.time >= 0)
    .sort((a, b) => a.time - b.time);

  let atRisk = rows.length;
  let survival = 1;
  let cumulativeHazard = 0;
  const points: SurvivalPoint[] = [];

  for (let i = 0; i < rows.length;) {
    const time = rows[i].time;
    let events = 0;
    let censored = 0;

    while (i < rows.length && rows[i].time === time) {
      if (rows[i].event) events += 1;
      else censored += 1;
      i += 1;
    }

    if (events > 0 && atRisk > 0) {
      survival *= 1 - events / atRisk;
      cumulativeHazard += events / atRisk;
    }

    points.push({ time, atRisk, events, censored, survival, cumulativeHazard });
    atRisk -= events + censored;
  }

  return points;
}
