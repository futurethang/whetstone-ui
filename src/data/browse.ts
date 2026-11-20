import "server-only";
import { sortEntries } from "./adapters/facets";
import { inTopic } from "./adapters/topic-tree";
import { getChangesSinceVisit } from "./changes";
import { getPendingProposals } from "./digest";
import { listEntries } from "./entries";
import { STATUS_ORDER, type EntrySummary, type Observation, type SearchSort, type Topic, type TopicNode } from "./models";
import { getBudget, getObservations, getRuns, getSources } from "./pipeline";
import { getTopics, topicTree } from "./topics";

export type GroupCounts = { total: number; stale: number; byStatus: Record<string, number> };

function counts(entries: EntrySummary[]): GroupCounts {
  const byStatus: Record<string, number> = {};
  for (const e of entries) byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
  return { total: entries.length, stale: entries.filter((e) => e.staleness.stale).length, byStatus };
}

const inGroup = (e: EntrySummary, topic: string) => e.topics.some((t) => inTopic(t, topic));

export type TopicCard = { topic: Topic; counts: GroupCounts; children: Array<{ topic: Topic; counts: GroupCounts }> };

/** Everything Home needs, fetched together so a failure shows one notice instead of partial content. */
export async function getHome(lastVisitDay: string | null) {
  // Every request starts at once; the entry list and topics are parsed once and shared.
  const topicsP = getTopics();
  const entriesP = listEntries({ lastVisitDay, topics: topicsP });
  const [entries, topics, since, proposals, runs, sources, budget] = await Promise.all([
    entriesP,
    topicsP,
    getChangesSinceVisit(lastVisitDay, entriesP),
    getPendingProposals(entriesP),
    getRuns(1),
    getSources(),
    getBudget(),
  ]);
  const due = sortEntries(entries.filter((e) => e.staleness.stale), "overdue", null);
  const cards: TopicCard[] = topicTree(topics).map((root) => ({
    topic: root,
    counts: counts(entries.filter((e) => inGroup(e, root.id))),
    children: root.children.map((c) => ({ topic: c, counts: counts(entries.filter((e) => inGroup(e, c.id))) })),
  }));
  return {
    since,
    pendingProposals: proposals.length,
    due: due.slice(0, 5),
    dueTotal: due.length,
    cards,
    pipeline: { lastRun: runs[0] ?? null, failingSources: sources.filter((s) => s.failing).length, budget },
  };
}

export type TopicGrouping = "status" | "subtopic" | "none";
export type TopicView = { group: TopicGrouping; sort: Exclude<SearchSort, "relevance">; showDeprecated: boolean };

export function parseTopicView(raw: Record<string, string | string[] | undefined>): TopicView {
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : (raw[k] as string | undefined)) ?? "";
  const group = one("group");
  const sort = one("sort");
  return {
    group: group === "subtopic" || group === "none" ? group : "status",
    sort: sort === "overdue" || sort === "title" ? sort : "changed",
    showDeprecated: one("deprecated") === "show",
  };
}

export type TopicSection = { key: string; heading: string; status?: string; entries: EntrySummary[] };

export async function getTopicPage(id: string, view: TopicView, lastVisitDay: string | null): Promise<{
  topic: Topic;
  ancestors: Topic[];
  children: Array<{ topic: Topic; counts: GroupCounts }>;
  counts: GroupCounts;
  sections: TopicSection[];
  hiddenDeprecated: number;
  observations: Observation[];
  tree: TopicNode[];
} | null> {
  // All three requests start at once (one round trip on a cold cache, not two); an unknown topic wastes two cached reads.
  const topicsP = getTopics();
  const [topics, entries, observations] = await Promise.all([topicsP, listEntries({ lastVisitDay, topics: topicsP }), getObservations({ topic: id, limit: 5 })]);
  const topic = topics.find((t) => t.id === id);
  if (!topic) return null;
  const byId = new Map(topics.map((t) => [t.id, t]));
  const segs = id.split("/");
  const ancestors = segs.slice(0, -1).map((_, i) => byId.get(segs.slice(0, i + 1).join("/"))!).filter(Boolean);
  const mine = entries.filter((e) => inGroup(e, id));
  const children = topics.filter((t) => t.parentId === id).map((c) => ({ topic: c, counts: counts(mine.filter((e) => inGroup(e, c.id))) }));
  const visible = sortEntries(view.showDeprecated ? mine : mine.filter((e) => e.status !== "deprecated"), view.sort, null);

  let sections: TopicSection[];
  if (view.group === "status") {
    const known = STATUS_ORDER.map((st) => ({ key: st, heading: st.charAt(0).toUpperCase() + st.slice(1), status: st as string, entries: visible.filter((e) => e.status === st) }));
    const other = visible.filter((e) => !(STATUS_ORDER as readonly string[]).includes(e.status));
    sections = [...known, ...(other.length ? [{ key: "other", heading: "Other status", entries: other }] : [])].filter((s) => s.entries.length);
  } else if (view.group === "subtopic") {
    const subOf = (e: EntrySummary) => e.topics.find((t) => inTopic(t, id) && t !== id) ?? id;
    const keys = [...new Set(visible.map(subOf))].sort();
    sections = keys.map((k) => ({ key: k, heading: k === id ? `${topic.label} (general)` : (byId.get(k)?.label ?? k), entries: visible.filter((e) => subOf(e) === k) }));
  } else {
    sections = visible.length ? [{ key: "all", heading: "Entries", entries: visible }] : [];
  }
  return { topic, ancestors, children, counts: counts(mine), sections, hiddenDeprecated: mine.length - visible.length, observations, tree: topicTree(topics) };
}
