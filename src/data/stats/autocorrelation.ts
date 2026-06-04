export type AutocorrelationPoint = {
  lag: number;
  value: number;
};

export function autocorrelation(values: unknown[], requestedMaxLag: number): AutocorrelationPoint[] {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (finite.length < 2) return [];

  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const denominator = finite.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  if (denominator === 0) return [];

  const maxLag = Math.max(0, Math.min(Math.floor(requestedMaxLag), finite.length - 1));
  const points: AutocorrelationPoint[] = [];
  for (let lag = 1; lag <= maxLag; lag++) {
    let numerator = 0;
    for (let i = lag; i < finite.length; i++) {
      numerator += (finite[i] - mean) * (finite[i - lag] - mean);
    }
    points.push({ lag, value: numerator / denominator });
  }
  return points;
}
