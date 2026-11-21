import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/data/client";
import { getSource } from "@/data/pipeline";
import { HEALTH_LABEL } from "@/data/pipeline";
import { formatDate, formatRelative } from "@/lib/format";
import { External } from "@/ui/External";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { Breadcrumb } from "@/ui/layout/Breadcrumb";
import l from "@/ui/lists/Lists.module.css";
import p from "@/ui/Page.module.css";
import { TierBadge } from "@/ui/signals/TierBadge";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const s = await getSource((await params).id);
    return { title: s ? `${s.name} (source)` : "Source not found" };
  } catch {
    return { title: "Source" };
  }
}

export default async function SourcePage({ params }: Props) {
  const { id } = await params;
  let s: Awaited<ReturnType<typeof getSource>>;
  try {
    s = await getSource(id);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Source" />;
    throw e;
  }
  if (!s) notFound();
  return (
    <>
      <Breadcrumb items={[{ href: "/pipeline", label: "Pipeline" }]} />
      <h1>{s.name}</h1>
      <dl className={p.facts}>
        <dt>Health</dt>
        <dd>
          {HEALTH_LABEL[s.health]}
          {s.advice ? `: ${s.advice}` : ""}
        </dd>
        <dt>Tier</dt>
        <dd>
          <TierBadge tier={s.tier} />
        </dd>
        <dt>Type</dt>
        <dd>{s.type}</dd>
        <dt>Status</dt>
        <dd>{s.status}</dd>
        <dt>Topics</dt>
        <dd>{s.topics.length ? s.topics.map((t, i) => <span key={t}>{i ? ", " : ""}<a href={`/t/${t}`}>{t}</a></span>) : "—"}</dd>
        <dt>Checked</dt>
        <dd>every {s.cadence}</dd>
        <dt>Last success</dt>
        <dd>{s.lastSuccessAt ? formatRelative(s.lastSuccessAt) : "never"}</dd>
        <dt>Consecutive failures</dt>
        <dd>{s.consecutiveFailures}</dd>
        {s.lastError ? (
          <>
            <dt>Last error</dt>
            <dd className={p.error}>{s.lastError}</dd>
          </>
        ) : null}
        <dt>Track record</dt>
        <dd>
          {s.accepted} accepted of {s.contributed} contributed
        </dd>
        {s.url ? (
          <>
            <dt>Website</dt>
            <dd>
              <External href={s.url}>{new URL(s.url).hostname}</External>
            </dd>
          </>
        ) : null}
      </dl>
      <section aria-labelledby="items-h" className={p.block}>
        <h2 id="items-h">Recent items</h2>
        {s.items.length ? (
          <ul className={l.plain}>
            {s.items.map((i) => (
              <li key={i.id}>
                <a href={`/i/${i.id}`}>{i.title ?? i.url}</a>
                <div className={l.meta}>
                  {i.publishedAt ? `Published ${formatDate(i.publishedAt)} · ` : ""}
                  {i.state}
                  {i.relevance !== null ? ` · relevance ${i.relevance.toFixed(2)}` : ""}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>
            <p>No items collected recently.</p>
          </EmptyState>
        )}
      </section>
    </>
  );
}
