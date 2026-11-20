import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/data/client";
import { getObservation } from "@/data/pipeline";
import { formatDate, formatDateTime } from "@/lib/format";
import { External } from "@/ui/External";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import l from "@/ui/lists/Lists.module.css";
import p from "@/ui/Page.module.css";
import { TierBadge } from "@/ui/signals/TierBadge";

export const metadata: Metadata = { title: "Observation" };

type Props = { params: Promise<{ id: string }> };

export default async function ObservationPage({ params }: Props) {
  const { id } = await params;
  let o: Awaited<ReturnType<typeof getObservation>>;
  try {
    o = await getObservation(id);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Observation" />;
    throw e;
  }
  if (!o) notFound();
  return (
    <>
      <h1>Observation {o.id}</h1>
      <p className={p.unreviewed}>Unreviewed pipeline output</p>
      <blockquote className={p.claim}>{o.claim}</blockquote>
      <dl className={p.facts}>
        <dt>Topic</dt>
        <dd>
          <a href={`/t/${o.topic}`}>{o.topic}</a>
        </dd>
        {o.entryId ? (
          <>
            <dt>Entry</dt>
            <dd>
              <a href={`/e/${o.entryId}`}>{o.entryId}</a>
            </dd>
          </>
        ) : null}
        <dt>Kind</dt>
        <dd>{o.kind.replace(/_/g, " ")}</dd>
        <dt>Stance</dt>
        <dd>{o.stance}</dd>
        <dt>Strength</dt>
        <dd>{o.strength}</dd>
        <dt>Status</dt>
        <dd>{o.status}</dd>
        <dt>First seen</dt>
        <dd>{formatDateTime(o.firstSeen)}</dd>
        <dt>Last seen</dt>
        <dd>{formatDateTime(o.lastSeen)}</dd>
      </dl>
      <section aria-labelledby="cites-h" className={p.block}>
        <h2 id="cites-h">Citing items</h2>
        <ul className={l.plain}>
          {o.citations.map((c) => (
            <li key={c.url}>
              <p className={p.row}>
                <TierBadge tier={c.tier} />
                {c.itemId ? <a href={`/i/${c.itemId}`}>{c.sourceName ?? "Article"}</a> : <span>{c.sourceName ?? "Unknown source"}</span>}
                {c.authorName ? <span>by {c.authorName}</span> : null}
                {c.publishedAt ? <span>{formatDate(c.publishedAt)}</span> : null}
                <External href={c.url}>Original</External>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
