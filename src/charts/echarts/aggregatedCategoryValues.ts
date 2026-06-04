import { finiteCategoryValues, type CategoryValue } from './finiteCategoryValues';
import type { ChartConfig } from '@/charts/types';
import type { DataView } from '@/types/data';

/**
 * (category, value) pairs with repeated category keys SUMMED, in first-seen order.
 * Layers grouping over finiteCategoryValues so long-form data (e.g. sales by region
 * across quarters) renders one slice/stem/bar per category rather than one per raw
 * row — matching bar/horizontal_bar (which aggregate via groupByAggregate). Non-finite
 * values are already dropped by finiteCategoryValues, so a category with no finite
 * value is omitted (the empty-state guard still fires when nothing remains).
 */
export function aggregatedCategoryValues(data: DataView, config: ChartConfig): CategoryValue[] {
  const totals = new Map<string, number>();
  const order: string[] = [];
  for (const { name, value } of finiteCategoryValues(data, config)) {
    if (!totals.has(name)) order.push(name);
    totals.set(name, (totals.get(name) ?? 0) + value);
  }
  return order.map((name) => ({ name, value: totals.get(name)! }));
}
