import "server-only";
import { TopicsResponse } from "./api-types";
import { apiGet } from "./client";
import { topicLabel } from "./adapters/topic-labels";
import type { Audience, Topic } from "./models";

export async function getTopics(_opts: { audience?: Audience } = {}): Promise<Topic[]> {
  const res = await apiGet({ source: "topics", path: "topics", schema: TopicsResponse, tags: ["topics"] });
  return res.topics.map((t) => ({
    id: t.id,
    label: topicLabel(t.id),
    parentId: t.parent,
    depth: t.id.split("/").length - 1,
    entryCount: t.entries,
    staleCount: t.stale,
    countsByStatus: t.by_status,
    reviewIntervalDays: t.review_interval_days,
  }));
}
