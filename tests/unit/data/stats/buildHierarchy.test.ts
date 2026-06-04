import { describe, it, expect } from 'vitest';
import { buildHierarchy } from '@/data/stats/buildHierarchy';
import type { TreeNode } from '@/data/stats/buildHierarchy';

describe('buildHierarchy', () => {
  it('builds the documented reference tree (root + nested children, first-seen order)', () => {
    const tree = buildHierarchy(['a', 'b', 'c', 'd'], [null, 'a', 'a', 'b'], [0, 10, 20, 5]);
    const expected: TreeNode[] = [
      {
        name: 'a',
        value: 0,
        children: [
          { name: 'b', value: 10, children: [{ name: 'd', value: 5 }] },
          { name: 'c', value: 20 },
        ],
      },
    ];
    expect(tree).toEqual(expected);
  });

  it('omits empty children arrays for leaf nodes', () => {
    const tree = buildHierarchy(['a', 'b'], [null, 'a'], [1, 2]);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].children).toBeUndefined();
  });

  it('treats a node as root when its parent id is absent', () => {
    const tree = buildHierarchy(['a', 'b'], ['ghost', 'a'], [1, 2]);
    expect(tree).toEqual([{ name: 'a', value: 1, children: [{ name: 'b', value: 2 }] }]);
  });

  it('treats null/undefined/empty-string parents as roots', () => {
    const tree = buildHierarchy(['x', 'y', 'z'], [null, undefined, ''], [1, 2, 3]);
    expect(tree.map((n) => n.name)).toEqual(['x', 'y', 'z']);
    expect(tree.every((n) => n.children === undefined)).toBe(true);
  });

  it('treats a node that is its own parent as a root', () => {
    const tree = buildHierarchy(['a', 'b'], ['a', 'a'], [7, 8]);
    expect(tree).toEqual([{ name: 'a', value: 7, children: [{ name: 'b', value: 8 }] }]);
  });

  it('coerces non-finite values to 0', () => {
    const tree = buildHierarchy(['a', 'b', 'c'], [null, null, null], ['oops', Infinity, NaN]);
    expect(tree).toEqual([
      { name: 'a', value: 0 },
      { name: 'b', value: 0 },
      { name: 'c', value: 0 },
    ]);
  });

  it('coerces numeric-string values to finite numbers', () => {
    const tree = buildHierarchy(['a'], [null], ['42']);
    expect(tree).toEqual([{ name: 'a', value: 42 }]);
  });

  it('stringifies non-string ids and parents for matching', () => {
    const tree = buildHierarchy([1, 2], [null, 1], [10, 20]);
    expect(tree).toEqual([{ name: '1', value: 10, children: [{ name: '2', value: 20 }] }]);
  });

  it('ignores rows whose id is empty, null, or undefined', () => {
    const tree = buildHierarchy(['a', '', null, undefined, 'b'], [null, null, null, null, 'a'], [1, 9, 9, 9, 2]);
    expect(tree).toEqual([{ name: 'a', value: 1, children: [{ name: 'b', value: 2 }] }]);
  });

  it('keeps only the first row for a duplicate id', () => {
    const tree = buildHierarchy(['a', 'a'], [null, null], [1, 99]);
    expect(tree).toEqual([{ name: 'a', value: 1 }]);
  });

  it('returns [] for empty input', () => {
    expect(buildHierarchy([], [], [])).toEqual([]);
  });

  it('truncates to the shortest of the three columns', () => {
    const tree = buildHierarchy(['a', 'b', 'c'], [null, 'a'], [1, 2, 3]);
    expect(tree).toEqual([{ name: 'a', value: 1, children: [{ name: 'b', value: 2 }] }]);
  });

  it('breaks a two-node mutual cycle by leaving both nodes as roots', () => {
    // a→b and b→a: attaching either would close the cycle, so both stay roots.
    const tree = buildHierarchy(['a', 'b'], ['b', 'a'], [1, 2]);
    expect(tree).toEqual([
      { name: 'a', value: 1 },
      { name: 'b', value: 2 },
    ]);
  });

  it('breaks a longer cycle: a→b, b→c, c→b attaches a under b and keeps b, c as roots', () => {
    // The b↔c back-edge is broken (both roots); a is not part of the cycle and
    // attaches under b. Walking a's chain b→c→b hits an already-seen node, so the
    // cycle is detected without ever reaching a — exercising the `seen` guard.
    const tree = buildHierarchy(['a', 'b', 'c'], ['b', 'c', 'b'], [1, 2, 3]);
    expect(tree).toEqual([
      { name: 'b', value: 2, children: [{ name: 'a', value: 1 }] },
      { name: 'c', value: 3 },
    ]);
  });
});
