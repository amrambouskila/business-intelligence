import { reduceFiniteValues, type FiniteReduceOp } from '@/data/stats/reduceFiniteValues';

export type AggOp = FiniteReduceOp | 'count';

export interface AggregatedSeries {
  keys: string[];
  values: number[];
}

interface Group {
  count: number;
  finite: number[];
}

function reduceGroup(group: Group, op: AggOp): number {
  if (op === 'count') {
    return group.count;
  }
  return reduceFiniteValues(group.finite, op);
}

export function groupByAggregate(keyData: unknown[], valueData: unknown[], op: AggOp): AggregatedSeries {
  const rowCount = Math.min(keyData.length, valueData.length);
  const order: string[] = [];
  const groups = new Map<string, Group>();

  for (let i = 0; i < rowCount; i++) {
    const key = String(keyData[i]);
    let group = groups.get(key);
    if (group === undefined) {
      group = { count: 0, finite: [] };
      groups.set(key, group);
      order.push(key);
    }
    group.count += 1;
    const value = valueData[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      group.finite.push(value);
    }
  }

  const values = order.map((key) => reduceGroup(groups.get(key)!, op));
  return { keys: order, values };
}
