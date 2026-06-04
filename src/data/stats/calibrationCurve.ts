/** Reliability (calibration) curve: bin predicted probabilities vs observed frequency. */
import { isPositiveLabel } from './isPositiveLabel';

export interface CalibrationBin {
  meanPredicted: number;
  observedRate: number;
  count: number;
}

interface BinAccumulator {
  scoreSum: number;
  positives: number;
  count: number;
}

/**
 * Calibration curve over `bins` equal-width bins of [0,1].
 *
 * Scores are predicted probabilities; only finite scores within [0,1] are kept.
 * Bin index = min(floor(score·bins), bins−1) so score===1 lands in the last bin.
 * Per non-empty bin: meanPredicted = mean score, observedRate = positives/count.
 * Empty bins are dropped; bins are returned in ascending order. bins < 1 → 1.
 */
export function calibrationCurve(scores: number[], labels: unknown[], bins: number): CalibrationBin[] {
  const binCount = bins < 1 ? 1 : Math.floor(bins);
  const accumulators: BinAccumulator[] = Array.from({ length: binCount }, () => ({
    scoreSum: 0,
    positives: 0,
    count: 0,
  }));

  const pairCount = Math.min(scores.length, labels.length);
  for (let i = 0; i < pairCount; i++) {
    const score = scores[i];
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      continue;
    }
    const index = Math.min(Math.floor(score * binCount), binCount - 1);
    const bin = accumulators[index];
    bin.scoreSum += score;
    bin.count += 1;
    if (isPositiveLabel(labels[i])) {
      bin.positives += 1;
    }
  }

  const result: CalibrationBin[] = [];
  for (const bin of accumulators) {
    if (bin.count === 0) {
      continue;
    }
    result.push({
      meanPredicted: bin.scoreSum / bin.count,
      observedRate: bin.positives / bin.count,
      count: bin.count,
    });
  }
  return result;
}
