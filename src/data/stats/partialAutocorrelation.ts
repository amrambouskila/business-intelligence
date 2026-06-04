import { autocorrelation, type AutocorrelationPoint } from './autocorrelation';

export function partialAutocorrelation(values: unknown[], requestedMaxLag: number): AutocorrelationPoint[] {
  const acf = autocorrelation(values, requestedMaxLag);
  if (acf.length === 0) return [];

  const r = [1, ...acf.map((point) => point.value)];
  const phi: number[][] = [[0]];
  const points: AutocorrelationPoint[] = [];

  for (let lag = 1; lag < r.length; lag++) {
    let numerator = r[lag];
    let denominator = 1;
    for (let j = 1; j < lag; j++) {
      numerator -= phi[lag - 1][j] * r[lag - j];
      denominator -= phi[lag - 1][j] * r[j];
    }

    const current = numerator / denominator;

    phi[lag] = Array(lag + 1).fill(0) as number[];
    phi[lag][lag] = current;
    for (let j = 1; j < lag; j++) {
      phi[lag][j] = phi[lag - 1][j] - current * phi[lag - 1][lag - j];
    }
    points.push({ lag, value: current });
  }

  return points;
}
