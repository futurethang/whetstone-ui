import type { Metadata } from "next";
import { ApiError } from "@/data/client";
import type { Source } from "@/data/models";
import { HEALTH_LABEL, getSources } from "@/data/pipeline";
import { REPO_URL } from "@/lib/repo";
import { formatAgo, formatRelative } from "@/lib/format";
import { External } from "@/ui/External";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { Breadcrumb } from "@/ui/layout/Breadcrumb";
import p from "@/ui/Page.module.css";
import { TierBadge } from "@/ui/signals/TierBadge";

export const metadata: Metadata = { title: "Sources" };

const ORDER = ["broken", "never", "quiet", "ok"] as const;
const BLURB: Record<(typeof ORDER)[number], string> = {
  broken: "Every recent attempt failed. Nothing from these reaches the pipeline.",
  never: "Registered but not fetched successfully yet.",
  quiet: "Reachable, but no recent articles. May be abandoned, or the feed URL may be wrong.",
  ok: "Fetched recently and producing articles.",
};

function Table({ id, sources }: { id: string; sources: Source[] }) {
  return (
    <div className={p.tableWrap} role="region" aria-label={`${HEALTH_LABEL[sources[0]!.health]} sources, scrollable`} tabIndex={0}>
      <table className={p.table} aria-labelledby={id}>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Tier</th>
            <th scope="col">Last success</th>
            <th scope="col">Newest article</th>
            <th scope="col">Accepted / contributed</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id}>
              <th scope="row">
                <a href={`/pipeline/sources/${s.id}`}>{s.name}</a>
                <br />
                <small>
                  {s.type}, every {s.cadence}
                </small>
              </th>
              <td>
                <TierBadge tier={s.tier} />
              </td>
              <td>{s.lastSuccessAt ? formatAgo(s.lastSuccessAt) : "never"}</td>
              <td>{s.lastItemAt ? formatRelative(s.lastItemAt) : "none"}</td>
              <td className={p.num}>
                {s.accepted} / {s.contributed}
              </td>
              <td>
                {s.advice ? (
                  <>
                    {s.lastError ? <span className={p.mono}>{s.lastError} ({s.consecutiveFailures} in a row)</span> : null}
                    {s.lastError ? <br /> : null}
                    {s.advice}
                  </>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SourcesPage() {
  let sources: Source[];
  try {
    sources = await getSources();
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Sources" />;
    throw e;
  }
  const groups = ORDER.map((h) => ({ h, list: sources.filter((s) => s.health === h).sort((a, b) => b.consecutiveFailures - a.consecutiveFailures || a.name.localeCompare(b.name)) }));
  return (
    <>
      <Breadcrumb items={[{ href: "/pipeline", label: "Pipeline" }]} />
      <h1>Sources</h1>
      <p className={p.lede}>
        {sources.length} configured: {groups.map((g) => `${g.list.length} ${HEALTH_LABEL[g.h].toLowerCase()}`).join(", ")}. Fix a source by editing its entry in the{" "}
        <External href={`${REPO_URL}/tree/master/knowledge/registry`}>registry</External> (sources.yaml, or authors.yaml for a person&apos;s blog and Bluesky channels).
      </p>
      {groups.map(({ h, list }) =>
        list.length ? (
          <section key={h} aria-labelledby={`${h}-h`} className={p.block}>
            <h2 id={`${h}-h`}>
              {HEALTH_LABEL[h]} ({list.length})
            </h2>
            <p className={p.lede}>{BLURB[h]}</p>
            <Table id={`${h}-h`} sources={list} />
          </section>
        ) : null,
      )}
    </>
  );
}
