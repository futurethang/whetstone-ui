import type { Metadata } from "next";
import { getHome } from "@/data/browse";
import { ApiError } from "@/data/client";
import { formatDayShort, formatRelative, formatUsd, plural } from "@/lib/format";
import { getLastVisit } from "@/lib/last-visit";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ChangeRow } from "@/ui/lists/ChangeRow";
import l from "@/ui/lists/Lists.module.css";
import { EntryRow } from "@/ui/lists/EntryRow";
import { RunStatus } from "@/ui/signals/RunStatus";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const lastVisit = await getLastVisit();
  let home: Awaited<ReturnType<typeof getHome>>;
  try {
    home = await getHome(lastVisit?.day ?? null);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Whetstone" />;
    throw e;
  }
  const { since, due, dueTotal, cards, pipeline, pendingProposals } = home;
  const sinceLabel = since.firstVisit ? "In the last 7 days" : `Since ${formatDayShort(since.since)}`;
  const labels = new Map(cards.flatMap((c) => [[c.topic.id, c.topic.label] as const, ...c.children.map((x) => [x.topic.id, `${c.topic.label} › ${x.topic.label}`] as const)]));

  return (
    <>
      <h1 className="visually-hidden">Whetstone</h1>

      <section aria-labelledby="since-h" className={s.section}>
        <div className={s.sectionHead}>
          <h2 id="since-h">{sinceLabel}</h2>
          <form action="/api/last-visit" method="post">
            <input type="hidden" name="return_to" value="/" />
            <button type="submit" className={s.button}>
              Mark all seen
            </button>
          </form>
        </div>
        {since.changes.length ? (
          <ul className={l.changes}>
            {since.changes.map((c) => (
              <ChangeRow key={c.entryId} change={c} topicLabel={c.entryTopic ? labels.get(c.entryTopic) : undefined} />
            ))}
          </ul>
        ) : (
          <EmptyState>
            <p>Nothing changed {since.firstVisit ? "in the last 7 days" : `since ${formatDayShort(since.since)}`}.</p>
          </EmptyState>
        )}
        <p className={s.more}>
          <a href="/changes">All changes</a>
        </p>
      </section>

      <p className={s.digest}>
        <a href="/digest">{pendingProposals > 0 ? `Digests: ${plural(pendingProposals, "proposal")} waiting for review` : "Digests: nothing waiting for review"}</a>
      </p>

      <section aria-labelledby="due-h" className={s.section}>
        <h2 id="due-h">Due for review</h2>
        {due.length ? (
          <>
            {due.map((e) => (
              <EntryRow key={e.id} entry={e} as="h3" variant="compact" />
            ))}
            <p className={s.more}>
              <a href="/search?stale=1&sort=overdue">All {dueTotal} due for review</a>
            </p>
          </>
        ) : (
          <EmptyState>
            <p>Nothing is overdue for review.</p>
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="topics" className={s.section}>
        <h2 id="topics">Topics</h2>
        <ul className={s.cards}>
          {cards.map((c) => (
            <li key={c.topic.id} className={s.card}>
              <h3>
                <a href={`/t/${c.topic.id}`}>{c.topic.label}</a>
              </h3>
              <p className={s.count}>
                {plural(c.counts.total, "entry", "entries")}
                {c.counts.stale ? `, ${c.counts.stale} stale` : ""}
              </p>
              {c.children.length ? (
                <ul className={s.subtopics}>
                  {c.children.map((x) => (
                    <li key={x.topic.id}>
                      <a href={`/t/${x.topic.id}`}>{x.topic.label}</a> <span className={s.count}>{x.counts.total}{x.counts.stale ? `, ${x.counts.stale} stale` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pipeline-h" className={s.section}>
        <h2 id="pipeline-h">Pipeline</h2>
        <p className={s.pipeline}>
          {pipeline.lastRun ? (
            <>
              Last run: {pipeline.lastRun.job} <RunStatus status={pipeline.lastRun.status} /> {formatRelative(pipeline.lastRun.startedAt)}
            </>
          ) : (
            "No runs yet"
          )}
          {" · "}
          {plural(pipeline.failingSources, "source")} failing · {formatUsd(pipeline.budget.spentUsd)} of {formatUsd(pipeline.budget.capUsd)} this month ·{" "}
          <a href="/pipeline">Pipeline</a>
        </p>
      </section>
    </>
  );
}
