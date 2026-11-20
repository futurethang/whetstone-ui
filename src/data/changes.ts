import "server-only";
import { ChangesResponse } from "./api-types";
import { apiGet } from "./client";
import { addDays, todayIso } from "./adapters/dates";
import { inTopic as inTopic } from "./adapters/topic-tree";
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

export type ChangesView = { since: string | "last"; until: string | null; topic: string | null; kind: string | null };

export function parseChangesView(raw: Record<string, string | string[] | undefined>): ChangesView {
  const one = (k: string) => ((Array.isArray(raw[k]) ? raw[k]![0] : (raw[k] as string | undefined)) ?? "").trim();
  const day = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) ? v : null);
  const topic = one("topic");
  const kind = one("kind");
  return {
    since: day(one("since")) ?? "last",
    until: day(one("until")),
    topic: /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(topic) ? topic : null,
    kind: /^[a-z_]{1,40}$/.test(kind) ? kind : null,
  };
}

/** Monday of the ISO week containing `day`. */
export function isoWeekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(day, -offset);
}

/**
 * Changes page: events in [since, until), newest first, grouped by ISO week. `since=last` means the day after
 * the last visit (or 7 days ago on a first visit). `older` pages back by four weeks; it is null at the oldest event.
 */
export async function getChangesPage(view: ChangesView, lastVisitDay: string | null) {
  const since = view.since === "last" ? (lastVisitDay ? addDays(lastVisitDay, 1) : addDays(todayIso(), -7)) : view.since;
  const [{ events, hasMore }, oldest] = await Promise.all([getChanges({ since, until: view.until ?? undefined }), oldestChangeDay()]);
  const filtered = events.filter((e) => (!view.topic || (e.entryTopic && inTopic(e.entryTopic, view.topic))) && (!view.kind || e.kind === view.kind));
  const weeks: Array<{ weekStart: string; events: ChangeSummary[] }> = [];
  for (const e of filtered) {
    const w = isoWeekStart(e.date);
    const last = weeks[weeks.length - 1];
    if (last && last.weekStart === w) last.events.push({ ...e, more: 0 });
    else weeks.push({ weekStart: w, events: [{ ...e, more: 0 }] });
  }
  const kinds = [...new Map(events.map((e) => [e.kind, e.label])).entries()].map(([value, label]) => ({ value, label }));
  const older = oldest && since > oldest ? { since: addDays(since, -28), until: since } : null;
  return { since, until: view.until, sinceIsLastVisit: view.since === "last", firstVisit: !lastVisitDay, weeks, total: filtered.length, truncated: hasMore, kinds, older };
}
