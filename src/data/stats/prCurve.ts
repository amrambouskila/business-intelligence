/** Precision-recall curve and average precision (AP) for binary scores + labels. */
import { isPositiveLabel } from './isPositiveLabel';

export interface PrPoint {
  recall: number;
  precision: number;
  threshold: number;
}

export interface PrResult {
  points: PrPoint[];
  ap: number;
}

/**
 * Precision-recall curve. Pairs are sorted by score descending and TIED scores are
 * collapsed into one threshold: precision/recall are evaluated at each distinct
 * score over the prefix predicted positive at that threshold (precision = TP/seen,
 * recall = TP/P). One PrPoint is emitted per distinct score.
 *
 * AP is the tie-stable estimator ap = Σ_k (R_k − R_{k−1})·P_k (the area under the
 * step PR curve), which — unlike a per-rank precision sum — does not depend on the
 * arbitrary order of tied scores.
 *
 * Non-finite scores (and their labels) are dropped before ranking. With no
 * positives the result is { points: [], ap: 0 }.
 */
export function prCurve(scores: number[], labels: unknown[]): PrResult {
  const pairs: { score: number; positive: boolean }[] = [];
  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    if (Number.isFinite(score)) {
      pairs.push({ score, positive: isPositiveLabel(labels[i]) });
    }
  }

  const totalPositives = pairs.reduce((acc, p) => acc + (p.positive ? 1 : 0), 0);
  if (totalPositives === 0) {
    return { points: [], ap: 0 };
  }

  pairs.sort((a, b) => b.score - a.score);

  const points: PrPoint[] = [];
  let truePositives = 0;
  let seen = 0;
  let prevRecall = 0;
  let ap = 0;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].positive) {
      truePositives += 1;
    }
    seen += 1;
    const lastOfTie = i === pairs.length - 1 || pairs[i + 1].score !== pairs[i].score;
    if (lastOfTie) {
      const precision = truePositives / seen;
      const recall = truePositives / totalPositives;
      points.push({ recall, precision, threshold: pairs[i].score });
      ap += (recall - prevRecall) * precision;
      prevRecall = recall;
    }
  }

  return { points, ap };
}
