/** ROC curve + AUC for a binary classifier from raw scores + labels. */
import { isPositiveLabel } from './isPositiveLabel';

export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface RocResult {
  points: RocPoint[];
  auc: number;
}

interface ScoredLabel {
  score: number;
  positive: boolean;
}

const DEGENERATE: RocResult = {
  points: [
    { fpr: 0, tpr: 0, threshold: Infinity },
    { fpr: 1, tpr: 1, threshold: -Infinity },
  ],
  auc: 0.5,
};

/**
 * ROC curve and AUC. Pairs `scores[i]` with `labels[i]` over the shorter of the
 * two arrays, dropping pairs with a non-finite score. Points sweep thresholds in
 * descending-score order from (0,0) up to (1,1); `threshold` is the score at each
 * step (+Infinity for the leading (0,0) origin). AUC uses the trapezoidal rule
 * over points ordered by increasing fpr. When the sample has no positives OR no
 * negatives, returns the diagonal {(0,0),(1,1)} with auc 0.5.
 */
export function rocCurve(scores: number[], labels: unknown[]): RocResult {
  const len = Math.min(scores.length, labels.length);
  const pairs: ScoredLabel[] = [];
  for (let i = 0; i < len; i++) {
    const score = scores[i];
    if (Number.isFinite(score)) {
      pairs.push({ score, positive: isPositiveLabel(labels[i]) });
    }
  }

  const totalPositive = pairs.reduce((acc, p) => acc + (p.positive ? 1 : 0), 0);
  const totalNegative = pairs.length - totalPositive;

  if (totalPositive === 0 || totalNegative === 0) {
    return DEGENERATE;
  }

  pairs.sort((a, b) => b.score - a.score);

  // Collapse tied scores into a single threshold step: advance TP/FP across all
  // pairs sharing a score, then emit one point. Otherwise tied scores produce an
  // order-dependent staircase and a wrong AUC (e.g. all-tied input must give 0.5).
  const points: RocPoint[] = [{ fpr: 0, tpr: 0, threshold: Infinity }];
  let truePositive = 0;
  let falsePositive = 0;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].positive) {
      truePositive += 1;
    } else {
      falsePositive += 1;
    }
    const lastOfTie = i === pairs.length - 1 || pairs[i + 1].score !== pairs[i].score;
    if (lastOfTie) {
      points.push({
        fpr: falsePositive / totalNegative,
        tpr: truePositive / totalPositive,
        threshold: pairs[i].score,
      });
    }
  }

  // Points already run in non-decreasing fpr order (fpr only grows as negatives accrue).
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].fpr - points[i - 1].fpr;
    auc += (dx * (points[i].tpr + points[i - 1].tpr)) / 2;
  }

  return { points, auc };
}
