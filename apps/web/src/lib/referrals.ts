export type ReferralNode = {
  active: boolean;
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  referrerId: string | null;
};

export type ReferralFilter = "all" | "connected" | "referrers" | "unreferred" | "archived";

export function referralCreatesCycle(customerId: string, referrerId: string, parentById: ReadonlyMap<string, string | null>) {
  const visited = new Set<string>();
  let currentId: string | null = referrerId;
  while (currentId) {
    if (currentId === customerId || visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = parentById.get(currentId) ?? null;
  }
  return false;
}

export function filterReferralNodes(nodes: ReferralNode[], query: string, filter: ReferralFilter) {
  const children = new Map<string, string[]>();
  nodes.forEach((node) => {
    if (!node.referrerId) return;
    children.set(node.referrerId, [...(children.get(node.referrerId) || []), node.id]);
  });
  const needle = query.trim().toLocaleLowerCase();
  const matches = nodes.filter((node) => {
    const textMatches = !needle || [node.name, node.phone, node.email].some((value) => value?.toLocaleLowerCase().includes(needle));
    const filterMatches = filter === "all" || (filter === "connected" && Boolean(node.referrerId || children.has(node.id))) || (filter === "referrers" && children.has(node.id)) || (filter === "unreferred" && !node.referrerId) || (filter === "archived" && !node.active);
    return textMatches && filterMatches;
  });
  if (!needle && filter === "all") return nodes;

  const included = new Set(matches.map((node) => node.id));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const queue = [...included];
  while (queue.length) {
    const id = queue.shift()!;
    const parent = byId.get(id)?.referrerId;
    if (parent && !included.has(parent)) { included.add(parent); queue.push(parent); }
    for (const child of children.get(id) || []) if (!included.has(child)) { included.add(child); queue.push(child); }
  }
  return nodes.filter((node) => included.has(node.id));
}

export function referralDepth(nodeId: string, byId: Map<string, ReferralNode>) {
  let depth = 0;
  let current = byId.get(nodeId);
  const visited = new Set([nodeId]);
  while (current?.referrerId && byId.has(current.referrerId) && !visited.has(current.referrerId)) {
    visited.add(current.referrerId);
    depth += 1;
    current = byId.get(current.referrerId);
  }
  return depth;
}
