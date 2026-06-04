import { describe, it, expect } from 'vitest';
import { groupByAggregate } from '@/data/transforms/groupByAggregate';

describe('groupByAggregate', () => {
  it('sums values per key preserving first-seen order', () => {
    expect(groupByAggregate(['a', 'b', 'a', 'b'], [1, 2, 3, 4], 'sum')).toEqual({
      keys: ['a', 'b'],
      values: [4, 6],
    });
  });

  it('averages values per key', () => {
    expect(groupByAggregate(['a', 'b', 'a', 'b'], [1, 2, 3, 4], 'mean').values).toEqual([2, 3]);
  });

  it('counts all rows per key', () => {
    expect(groupByAggregate(['a', 'b', 'a', 'b'], [1, 2, 3, 4], 'count').values).toEqual([2, 2]);
  });

  it('takes the minimum value per key', () => {
    expect(groupByAggregate(['a', 'b', 'a', 'b'], [1, 2, 3, 4], 'min').values).toEqual([1, 2]);
  });

  it('takes the maximum value per key', () => {
    expect(groupByAggregate(['a', 'b', 'a', 'b'], [1, 2, 3, 4], 'max').values).toEqual([3, 4]);
  });

  it('preserves first-seen key order even when keys interleave', () => {
    expect(groupByAggregate(['b', 'a', 'b'], [1, 2, 3], 'sum').keys).toEqual(['b', 'a']);
  });

  it('computes the midpoint median for an odd-length group', () => {
    expect(groupByAggregate(['a', 'a', 'a'], [1, 3, 5], 'median').values).toEqual([3]);
  });

  it('averages the two middles for an even-length group median', () => {
    expect(groupByAggregate(['a', 'a'], [1, 4], 'median').values).toEqual([2.5]);
  });

  it('sorts before taking the median rather than trusting input order', () => {
    expect(groupByAggregate(['a', 'a', 'a'], [5, 1, 3], 'median').values).toEqual([3]);
  });

  it('ignores non-finite values for numeric ops', () => {
    expect(groupByAggregate(['a', 'a'], [NaN, 5], 'sum').values).toEqual([5]);
  });

  it('yields 0 for mean when a group has no finite values', () => {
    expect(groupByAggregate(['a'], [NaN], 'mean').values).toEqual([0]);
  });

  it('counts non-finite rows for the count op', () => {
    expect(groupByAggregate(['a'], [NaN], 'count').values).toEqual([1]);
  });

  it('yields 0 for sum/min/max/median when a group has no finite values', () => {
    const keys = ['a'];
    const values = [Infinity];
    expect(groupByAggregate(keys, values, 'sum').values).toEqual([0]);
    expect(groupByAggregate(keys, values, 'min').values).toEqual([0]);
    expect(groupByAggregate(keys, values, 'max').values).toEqual([0]);
    expect(groupByAggregate(keys, values, 'median').values).toEqual([0]);
  });

  it('ignores Infinity and -Infinity as non-finite', () => {
    expect(groupByAggregate(['a', 'a', 'a'], [Infinity, 2, -Infinity], 'sum').values).toEqual([2]);
  });

  it('treats non-number value entries as non-finite', () => {
    expect(groupByAggregate(['a', 'a'], ['x', 4], 'sum').values).toEqual([4]);
  });

  it('iterates only min(keyData.length, valueData.length) rows', () => {
    expect(groupByAggregate(['a', 'b', 'c'], [1, 2], 'sum')).toEqual({ keys: ['a', 'b'], values: [1, 2] });
  });

  it('coerces non-string keys via String()', () => {
    expect(groupByAggregate([1, 1, 2], [10, 20, 30], 'sum')).toEqual({ keys: ['1', '2'], values: [30, 30] });
  });

  it('returns empty series for empty input', () => {
    expect(groupByAggregate([], [], 'sum')).toEqual({ keys: [], values: [] });
  });

  it('returns empty series when one side is empty', () => {
    expect(groupByAggregate(['a', 'b'], [], 'sum')).toEqual({ keys: [], values: [] });
  });
});
