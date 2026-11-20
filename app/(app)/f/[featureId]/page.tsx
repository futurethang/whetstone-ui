import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/data/client";
import { getFeature } from "@/data/features";
import { formatDate, plural } from "@/lib/format";
import { getLastVisit } from "@/lib/last-visit";
import { External } from "@/ui/External";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { EntryRow } from "@/ui/lists/EntryRow";
import p from "@/ui/Page.module.css";
import { SupportBadge } from "@/ui/signals/SupportBadge";

type Props = { params: Promise<{ featureId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).featureId);
  try {
    const f = await getFeature(id);
    return { title: f ? `${f.feature.name} (feature)` : "Feature not found" };
  } catch {
    return { title: "Feature" };
  }
}

export default async function FeaturePage({ params }: Props) {
  const [{ featureId }, lastVisit] = await Promise.all([params, getLastVisit()]);
  const id = decodeURIComponent(featureId);
  let data: Awaited<ReturnType<typeof getFeature>>;
  try {
    data = await getFeature(id, { lastVisitDay: lastVisit?.day ?? null });
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Feature" />;
    throw e;
  }
  if (!data) notFound();
  const { feature: f, entries } = data;
  return (
    <>
      <h1>{f.name}</h1>
      <p className={p.row}>
        <SupportBadge level={f.level} since={f.level === "high" ? f.highDate : f.lowDate} />
        <span className={p.mono}>{f.id}</span>
      </p>
      {f.description ? <p className={p.lede}>{f.description}</p> : null}
      <dl className={p.facts}>
        <dt>Newly available</dt>
        <dd>{formatDate(f.lowDate)}</dd>
        <dt>Widely available</dt>
        <dd>{formatDate(f.highDate)}</dd>
        <dt>Specifications</dt>
        <dd>
          {f.specUrls.length
            ? f.specUrls.map((u, i) => (
                <span key={u}>
                  {i ? ", " : ""}
                  <External href={u}>{new URL(u).hostname}</External>
                </span>
              ))
            : "—"}
        </dd>
        {f.mdnSearch ? (
          <>
            <dt>MDN</dt>
            <dd>
              <External href={f.mdnSearch}>Search MDN</External>
            </dd>
          </>
        ) : null}
      </dl>
      <section aria-labelledby="citing-h" className={p.block}>
        <h2 id="citing-h">{plural(entries.length, "entry", "entries")} citing this feature</h2>
        {entries.length ? entries.map((e) => <EntryRow key={e.id} entry={e} as="h3" />) : <EmptyState><p>No entries cite this feature yet.</p></EmptyState>}
      </section>
    </>
  );
}
