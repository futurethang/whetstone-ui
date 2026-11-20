import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/data/client";
import { getItem } from "@/data/pipeline";
import { formatDate, formatDateTime } from "@/lib/format";
import { External } from "@/ui/External";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import l from "@/ui/lists/Lists.module.css";
import p from "@/ui/Page.module.css";
import { TierBadge } from "@/ui/signals/TierBadge";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const i = await getItem((await params).id);
    return { title: i?.title ?? (i ? "Article" : "Article not found") };
  } catch {
    return { title: "Article" };
  }
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  let i: Awaited<ReturnType<typeof getItem>>;
  try {
    i = await getItem(id);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Article" />;
    throw e;
  }
  if (!i) notFound();
  return (
    <>
      <h1>{i.title ?? "Untitled article"}</h1>
      <p className={p.unreviewed}>Collected by the pipeline</p>
      <dl className={p.facts}>
        <dt>Source</dt>
        <dd>
          <a href={`/pipeline/sources/${i.sourceId}`}>{i.sourceName ?? i.sourceId}</a> {i.sourceTier ? <TierBadge tier={i.sourceTier} /> : null}
        </dd>
        {i.authorName ? (
          <>
            <dt>Author</dt>
            <dd>{i.authorName}</dd>
          </>
        ) : null}
        <dt>Published</dt>
        <dd>{formatDate(i.publishedAt)}</dd>
        <dt>Collected</dt>
        <dd>{formatDateTime(i.fetchedAt)}</dd>
        <dt>Relevance</dt>
        <dd>{i.relevance !== null ? i.relevance.toFixed(2) : "—"}</dd>
        <dt>Processing</dt>
        <dd>{i.state}</dd>
        <dt>Link</dt>
        <dd>
          <External href={i.url}>{(() => { try { return new URL(i.url).hostname; } catch { return i.url; } })()}</External>
        </dd>
      </dl>
      <section aria-labelledby="obs-h" className={p.block}>
        <h2 id="obs-h">Observations extracted</h2>
        {i.observations.length ? (
          <ul className={l.plain}>
            {i.observations.map((o) => (
              <li key={o.id}>
                <a href={`/o/${o.id}`}>{o.claim}</a>
                <div className={l.meta}>
                  {o.kind} · {o.stance} · strength {o.strength}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>
            <p>No observations were extracted from this article.</p>
          </EmptyState>
        )}
      </section>
    </>
  );
}
