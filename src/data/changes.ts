import "server-only";
import { ChangesResponse } from "./api-types";
import { apiGet } from "./client";
import { addDays, todayIso } from "./adapters/dates";
import { eventLabel } from "./adapters/history";
import { listEntries } from "./entries";
import type { ChangeEvent, ChangeSummary } from "./models";

const s = (v: unknown) => (typeof v === "string" && v ? v : null);

/**
 * History events across entries on or after `since` and before `until` (both days), newest first.
 * The API caps a call at 500 events; `hasMore` says older ones remain in the window.
 */
export async function getChanges(args: { since: string; until?: string; limit?: number }): Promise<{ events: ChangeEvent[]; hasMore: boolean }> {
  const [res, entries] = await Promise.all([
    apiGet({ source: "changes", path: "changes", query: { since: args.since, until: args.until, limit: args.limit ?? 500 }, schema: ChangesResponse, tags: ["entries"] }),
    listEntries(),
  ]);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const events = res.changes.flatMap((c) => {
    const e = byId.get(c.entry_id);
    if (!e) return [];
    return [{ entryId: c.entry_id, entryTitle: e.title, entryTopic: e.primaryTopic, date: c.date, kind: c.event, label: eventLabel(c.event), from: s(c.from), to: s(c.to), note: s(c.note) }];
  });
  return { events, hasMore: res.has_more };
}

/** One row per entry: the latest event, with the number of others folded in ("+2 more"). */
export function latestPerEntry(events: ChangeEvent[]): ChangeSummary[] {
  const out = new Map<string, ChangeSummary>();
  for (const e of events) {
    const cur = out.get(e.entryId);
    if (!cur) out.set(e.entryId, { ...e, more: 0 });
    else cur.more += 1;
  }
  return [...out.values()];
}

/** Events strictly after the last-visit day (day granularity), or the last 7 days on a first visit. */
export async function getChangesSinceVisit(lastVisitDay: string | null): Promise<{ since: string; firstVisit: boolean; changes: ChangeSummary[] }> {
  const firstVisit = !lastVisitDay;
  const since = lastVisitDay ? addDays(lastVisitDay, 1) : addDays(todayIso(), -7);
  const { events } = await getChanges({ since, limit: 200 });
  return { since: lastVisitDay ?? since, firstVisit, changes: latestPerEntry(events) };
}

/** Oldest day any change can exist: the earliest first_seen across entries. */
export async function oldestChangeDay(): Promise<string | null> {
  const entries = await listEntries();
  return entries.reduce<string | null>((min, e) => (!min || e.firstSeen < min ? e.firstSeen : min), null);
}
