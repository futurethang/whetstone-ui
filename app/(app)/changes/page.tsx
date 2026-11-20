import type { Metadata } from "next";
import { getChangesPage, parseChangesView } from "@/data/changes";
import { ApiError } from "@/data/client";
import { getTopics } from "@/data/topics";
import { formatDate, formatDayShort, plural } from "@/lib/format";
import { getLastVisit } from "@/lib/last-visit";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ChangeRow } from "@/ui/lists/ChangeRow";
import l from "@/ui/lists/Lists.module.css";
import p from "@/ui/Page.module.css";

export const metadata: Metadata = { title: "Changes" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ChangesPage({ searchParams }: Props) {
  const [raw, lastVisit] = await Promise.all([searchParams, getLastVisit()]);
  const view = parseChangesView(raw);
  let data: Awaited<ReturnType<typeof getChangesPage>>;
  let topics: Awaited<ReturnType<typeof getTopics>>;
  try {
    [data, topics] = await Promise.all([getChangesPage(view, lastVisit?.day ?? null), getTopics()]);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Changes" />;
    throw e;
  }
  const labels = new Map(topics.map((t) => [t.id, t.label]));
  const range = data.sinceIsLastVisit
    ? data.firstVisit
      ? "in the last 7 days"
      : `since your last visit (${formatDayShort(lastVisit!.day)})`
    : `from ${formatDate(data.since)}${data.until ? ` to ${formatDate(data.until)}` : ""}`;
  const keep = (extra: Record<string, string | null>) => {
    const u = new URLSearchParams();
    const all = { since: view.since === "last" ? null : view.since, until: view.until, topic: view.topic, kind: view.kind, ...extra };
    for (const [k, v] of Object.entries(all)) if (v) u.set(k, v);
    const qs = u.toString();
    return qs ? `/changes?${qs}` : "/changes";
  };

  return (
    <>
      <h1>Changes</h1>
      <p className={p.lede}>
        {plural(data.total, "change")} {range}.{data.truncated ? " Showing the newest 500." : ""}
      </p>

      <form method="get" className={p.controls} aria-label="Filter changes">
        {view.since !== "last" ? <input type="hidden" name="since" value={view.since} /> : null}
        {view.until ? <input type="hidden" name="until" value={view.until} /> : null}
        <label>
          Topic
          <select name="topic" defaultValue={view.topic ?? ""}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.depth ? "— " : ""}
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event
          <select name="kind" defaultValue={view.kind ?? ""}>
            <option value="">All events</option>
            {data.kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>

      {data.weeks.length ? (
        data.weeks.map((w) => (
          <section key={w.weekStart} aria-labelledby={`w-${w.weekStart}`} className={p.block}>
            <h2 id={`w-${w.weekStart}`}>Week of {formatDayShort(w.weekStart).replace(/^\w+ /, "")}</h2>
            <ul className={l.changes}>
              {w.events.map((c, i) => (
                <ChangeRow key={`${c.entryId}-${c.date}-${i}`} change={c} topicLabel={c.entryTopic ? labels.get(c.entryTopic) : undefined} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <EmptyState>
          <p>No changes {range}.</p>
        </EmptyState>
      )}

      {data.older ? (
        <p className={p.block}>
          <a href={keep({ since: data.older.since, until: data.older.until })} rel="next">
            Older: {formatDate(data.older.since)} to {formatDate(data.older.until)}
          </a>
        </p>
      ) : (
        <p className={`${p.block} ${p.lede}`}>This is the oldest recorded change.</p>
      )}
    </>
  );
}
