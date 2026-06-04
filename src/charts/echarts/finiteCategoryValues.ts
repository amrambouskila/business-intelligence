import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

export interface CategoryValue {
  name: string;
  value: number;
}

/**
 * (category, value) pairs with non-finite values dropped — shared by pie/donut
 * so both filter NaN/Infinity identically and agree on the empty state.
 */
export function finiteCategoryValues(data: DataView, config: ChartConfig): CategoryValue[] {
  const labels = data.columnArrays[config.columns['category']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const out: CategoryValue[] = [];
  for (let i = 0; i < labels.length; i++) {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ name: String(labels[i]), value: v });
  }
  return out;
}
