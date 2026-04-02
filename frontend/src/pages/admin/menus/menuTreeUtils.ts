import type { MenuItem } from "@/api/menus";

export interface TreeNode extends MenuItem {
  treeChildren: TreeNode[];
}

export function buildTree(items: MenuItem[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];
  for (const item of items) {
    map.set(item.id, { ...item, treeChildren: [] });
  }
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.treeChildren.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortLevel = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortLevel(n.treeChildren));
  };
  sortLevel(roots);
  return roots;
}

/** DFS flatten — returns IDs in tree-display order (used for reorder API) */
export function flattenIds(nodes: TreeNode[]): number[] {
  const ids: number[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    ids.push(...flattenIds(n.treeChildren));
  }
  return ids;
}

/** Build indented label list for parent selector dropdown */
export function parentOptions(
  nodes: TreeNode[],
  excludeId: number | null,
  depth = 0,
): { id: number; label: string }[] {
  const result: { id: number; label: string }[] = [];
  for (const n of nodes) {
    if (n.id === excludeId) continue;
    const indent = "\u00A0\u00A0".repeat(depth);
    const prefix = depth > 0 ? `${indent}└ ` : "";
    result.push({ id: n.id, label: `${prefix}${n.zhName || n.enName}` });
    result.push(...parentOptions(n.treeChildren, excludeId, depth + 1));
  }
  return result;
}
