export interface TreeNode {
  name: string;
  value: number;
  children?: TreeNode[];
}

/**
 * Build a nested tree (for ECharts treemap/sunburst) from flat id/parent/value
 * columns. name = String(id); value = finite Number(value) else 0. A node is a
 * root when its parent is null/undefined/'', refers to an absent id, is the node
 * itself, or would close a cycle (a back-edge is broken so the output is always a
 * finite forest). Non-root nodes attach under their parent in first-seen order;
 * empty children arrays are omitted. Rows with empty/undefined id are ignored.
 */
export function buildHierarchy(ids: unknown[], parents: unknown[], values: unknown[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  const nodeById = new Map<string, TreeNode>();
  const parentKeyById = new Map<string, string | null>();

  const n = Math.min(ids.length, parents.length, values.length);
  for (let i = 0; i < n; i++) {
    const rawId = ids[i];
    if (rawId === undefined || rawId === null || rawId === '') continue;
    const id = String(rawId);
    if (nodeById.has(id)) continue;

    const rawValue = Number(values[i]);
    const node: TreeNode = { name: id, value: Number.isFinite(rawValue) ? rawValue : 0 };
    nodeById.set(id, node);
    nodes.push(node);

    const rawParent = parents[i];
    const parentKey =
      rawParent === undefined || rawParent === null || rawParent === '' ? null : String(rawParent);
    parentKeyById.set(id, parentKey === id ? null : parentKey);
  }

  // Does the parent chain starting at `startKey` reach `targetKey`? Used to
  // detect cycles so a back-edge is broken (the node becomes a root) instead of
  // producing an infinite, mutually-referential tree that hangs ECharts.
  const leadsTo = (startKey: string, targetKey: string): boolean => {
    let cur: string | null = startKey;
    const seen = new Set<string>();
    while (cur !== null) {
      if (cur === targetKey) return true;
      if (seen.has(cur)) return false;
      seen.add(cur);
      cur = parentKeyById.get(cur) ?? null;
    }
    return false;
  };

  const roots: TreeNode[] = [];
  for (const node of nodes) {
    const parentKey = parentKeyById.get(node.name)!;
    const parent = parentKey === null ? undefined : nodeById.get(parentKey);
    // Root when the parent is absent OR attaching would close a cycle back to this node.
    if (parent === undefined || leadsTo(parentKey!, node.name)) {
      roots.push(node);
    } else {
      (parent.children ??= []).push(node);
    }
  }

  return roots;
}
