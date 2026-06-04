import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

/**
 * The `score` column mapped to numbers (non-numbers -> NaN) so it stays
 * index-aligned with the label column; the consuming stats functions drop the
 * non-finite pairs. Filtering the score column in isolation would re-index it and
 * mis-pair every score with the wrong label. Shared by roc/pr/calibration charts.
 */
export function alignedScores(data: DataView, config: ChartConfig): number[] {
  const col = config.columns['score'];
  return (data.columnArrays[col] ?? []).map((v) => (typeof v === 'number' ? v : NaN));
}
