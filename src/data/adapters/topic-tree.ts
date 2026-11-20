import type { Topic, TopicNode } from "../models";
import { topicLabel } from "./topic-labels";

/**
 * Build the topic tree. A subtopic whose parent is not in the taxonomy (e.g. "ai-tooling/agents") gets an
 * implied parent node, so every topic is reachable and group pages work.
 */
export function withImpliedParents(topics: Topic[]): Topic[] {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const out = [...topics];
  for (const t of topics) {
    const segs = t.id.split("/");
    for (let i = 1; i < segs.length; i++) {
      const id = segs.slice(0, i).join("/");
      if (byId.has(id)) continue;
      const implied: Topic = {
        id,
        label: topicLabel(id),
        parentId: i > 1 ? segs.slice(0, i - 1).join("/") : null,
        depth: i - 1,
        entryCount: 0,
        staleCount: 0,
        countsByStatus: {},
        reviewIntervalDays: t.reviewIntervalDays,
        implied: true,
      };
      byId.set(id, implied);
      out.push(implied);
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function topicTree(topics: Topic[]): TopicNode[] {
  const nodes = new Map<string, TopicNode>(topics.map((t) => [t.id, { ...t, children: [] }]));
  const roots: TopicNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const sort = (list: TopicNode[]) => {
    list.sort((a, b) => a.label.localeCompare(b.label));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** True when `id` is `topic` or one of its descendants. */
export function inTopic(id: string, topic: string): boolean {
  return id === topic || id.startsWith(`${topic}/`);
}
