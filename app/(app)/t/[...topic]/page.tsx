import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopicPage, parseTopicView } from "@/data/browse";
import { ApiError } from "@/data/client";
import { getTopics } from "@/data/topics";
import { formatRelative, formatSpan, plural } from "@/lib/format";
import { getLastVisit } from "@/lib/last-visit";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { Breadcrumb } from "@/ui/layout/Breadcrumb";
import { TopicTree } from "@/ui/layout/TopicTree";
import { EntryRow } from "@/ui/lists/EntryRow";
import l from "@/ui/lists/Lists.module.css";
import { StatusBadge } from "@/ui/signals/StatusBadge";
import s from "./topic.module.css";

type Props = { params: Promise<{ topic: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const topicId = (segs: string[]) => segs.map((x) => decodeURIComponent(x).toLowerCase()).join("/");
const VALID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = topicId((await params).topic);
  try {
    const t = (await getTopics()).find((x) => x.id === id);
    return { title: t ? `${t.label} (${t.id})` : "Topic not found" };
  } catch {
    return { title: "Topic" };
  }
}

const STATUSES = ["established", "emerging", "contested", "deprecated"] as const;

export default async function TopicPage({ params, searchParams }: Props) {
  const [{ topic: segs }, sp, lastVisit] = await Promise.all([params, searchParams, getLastVisit()]);
  const id = topicId(segs);
  if (!VALID.test(id)) notFound();
  const view = parseTopicView(sp);

  let page: Awaited<ReturnType<typeof getTopicPage>>;
  try {
    page = await getTopicPage(id, view, lastVisit?.day ?? null);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Topic" />;
    throw e;
  }
  if (!page) notFound();
  const { topic, ancestors, children, counts, sections, hiddenDeprecated, observations, tree } = page;
  const search = (extra: string) => `/search?topic=${encodeURIComponent(topic.id)}${extra}`;

  return (
    <div className={s.layout}>
      <div className={s.side}>
        <TopicTree tree={tree} current={topic.id} />
      </div>

      <div className={s.content}>
        <Breadcrumb items={[{ href: "/", label: "Home" }, ...ancestors.map((a) => ({ href: `/t/${a.id}`, label: a.label }))]} />
        <h1>{topic.label}</h1>
        <p className={s.lede}>
          {topic.implied ? "A group of related topics." : `Entries here are due for review every ${formatSpan(topic.reviewIntervalDays)}.`} {plural(counts.total, "entry", "entries")}.
        </p>

        <ul className={s.summary} aria-label="Entries by status">
          {STATUSES.map((st) => (
            <li key={st}>
              <a href={search(`&status=${st}`)}>
                <StatusBadge status={st} /> <span className={s.n}>{counts.byStatus[st] ?? 0}</span>
              </a>
            </li>
          ))}
          <li>
            <a href={search("&stale=1&sort=overdue")}>
              Stale <span className={s.n}>{counts.stale}</span>
            </a>
          </li>
        </ul>

        {children.length ? (
          <section aria-labelledby="subtopics-h" className={s.block}>
            <h2 id="subtopics-h">Subtopics</h2>
            <ul className={l.inline}>
              {children.map((c) => (
                <li key={c.topic.id}>
                  <a href={`/t/${c.topic.id}`}>
                    {c.topic.label} ({c.counts.total}
                    {c.counts.stale ? `, ${c.counts.stale} stale` : ""})
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form method="get" className={s.controls} aria-label="List options">
          <label>
            Group by
            <select name="group" defaultValue={view.group}>
              <option value="status">Status</option>
              <option value="subtopic">Subtopic</option>
              <option value="none">None</option>
            </select>
          </label>
          <label>
            Sort by
            <select name="sort" defaultValue={view.sort}>
              <option value="changed">Recently changed</option>
              <option value="overdue">Most overdue</option>
              <option value="title">Title</option>
            </select>
          </label>
          <label className={s.check}>
            <input type="checkbox" name="deprecated" value="show" defaultChecked={view.showDeprecated} /> Show deprecated
          </label>
          <button type="submit">Apply</button>
        </form>

        {sections.length ? (
          sections.map((sec) => (
            <section key={sec.key} aria-labelledby={`g-${sec.key.replace(/\W/g, "-")}`} className={s.block}>
              <h2 id={`g-${sec.key.replace(/\W/g, "-")}`} className={s.groupHead}>
                {sec.status ? <StatusBadge status={sec.status} size="l" /> : sec.heading} <span className={s.n}>{sec.entries.length}</span>
              </h2>
              {sec.entries.map((e) => (
                <EntryRow key={e.id} entry={e} as="h3" showStatus={view.group !== "status"} />
              ))}
            </section>
          ))
        ) : (
          <EmptyState>
            <p>No entries in this topic{hiddenDeprecated ? " except deprecated ones" : ""}.</p>
          </EmptyState>
        )}
        {hiddenDeprecated ? (
          <p className={s.hidden}>
            {plural(hiddenDeprecated, "deprecated entry", "deprecated entries")} hidden.{" "}
            <a href={`/t/${topic.id}?group=${view.group}&sort=${view.sort}&deprecated=show`}>Show</a>
          </p>
        ) : null}

        <section aria-labelledby="signals-h" className={s.block}>
          <h2 id="signals-h">Recent signals</h2>
          {observations.length ? (
            <ul className={l.plain}>
              {observations.map((o) => (
                <li key={o.id}>
                  <a href={`/o/${o.id}`}>{o.claim}</a>
                  <div className={l.meta}>
                    {o.kind} · {o.stance} · strength {o.strength} · seen {formatRelative(o.lastSeen)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.lede}>No recent observations for this topic.</p>
          )}
        </section>
      </div>
    </div>
  );
}
