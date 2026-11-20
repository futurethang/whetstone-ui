import type { Metadata } from "next";
import { ApiError } from "@/data/client";
import type { Source } from "@/data/models";
import { getBudget, getRuns, getSources } from "@/data/pipeline";
import { formatDateTime, formatDuration, formatRelative, formatUsd } from "@/lib/format";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import p from "@/ui/Page.module.css";
import { RunStatus } from "@/ui/signals/RunStatus";
import { TierBadge } from "@/ui/signals/TierBadge";

export const metadata: Metadata = { title: "Pipeline" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const SORTS = {
  name: (a: Source, b: Source) => a.name.localeCompare(b.name),
  tier: (a: Source, b: Source) => ["normative", "expert", "community"].indexOf(a.tier) - ["normative", "expert", "community"].indexOf(b.tier),
  failures: (a: Source, b: Source) => b.consecutiveFailures - a.consecutiveFailures,
  success: (a: Source, b: Source) => (b.lastSuccessAt ?? "").localeCompare(a.lastSuccessAt ?? ""),
  accepted: (a: Source, b: Source) => b.accepted - a.accepted,
} as const;
type SortKey = keyof typeof SORTS;

export default async function PipelinePage({ searchParams }: Props) {
  const sp = await searchParams;
  const sortKey = (typeof sp.sort === "string" && sp.sort in SORTS ? sp.sort : "name") as SortKey;
  let budget, runs, sources;
  try {
    [budget, runs, sources] = await Promise.all([getBudget(), getRuns(50), getSources()]);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Pipeline" />;
    throw e;
  }
  // Failing sources always come first; the chosen sort applies within each group.
  const sorted = [...sources].sort((a, b) => Number(b.failing) - Number(a.failing) || SORTS[sortKey](a, b) || a.name.localeCompare(b.name));
  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sortKey === key ? (key === "name" || key === "tier" ? "ascending" : "descending") : undefined}>
      <a href={`/pipeline?sort=${key}#sources-h`}>{label}</a>
    </th>
  );

  return (
    <>
      <h1>Pipeline</h1>

      <section aria-labelledby="budget-h">
        <h2 id="budget-h">Budget</h2>
        <p>
          {formatUsd(budget.spentUsd)} of {formatUsd(budget.capUsd)} spent this month ({formatUsd(budget.remainingUsd)} left).
        </p>
        <meter className={p.meter} min={0} max={budget.capUsd} low={budget.capUsd * 0.7} high={budget.capUsd * 0.9} optimum={0} value={budget.spentUsd} aria-label="Month-to-date spend">
          {formatUsd(budget.spentUsd)} of {formatUsd(budget.capUsd)}
        </meter>
      </section>

      <section aria-labelledby="runs-h" className={p.block}>
        <h2 id="runs-h">Runs</h2>
        <div className={p.tableWrap} role="region" aria-label="Runs table, scrollable" tabIndex={0}>
          <table className={p.table} aria-labelledby="runs-h">
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Status</th>
                <th scope="col">Started</th>
                <th scope="col" className={p.num}>Duration</th>
                <th scope="col" className={p.num}>Cost</th>
                <th scope="col">Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.job}</th>
                  <td>
                    <RunStatus status={r.status} />
                  </td>
                  <td>
                    <time dateTime={r.startedAt} title={formatDateTime(r.startedAt)}>
                      {formatRelative(r.startedAt)}
                    </time>
                  </td>
                  <td className={p.num}>{formatDuration(r.durationMs)}</td>
                  <td className={p.num}>{formatUsd(r.costUsd)}</td>
                  <td>
                    {r.error ? (
                      <details>
                        <summary>Show error</summary>
                        <p className={p.error}>{r.error}</p>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sources-h" className={p.block}>
        <h2 id="sources-h">Sources</h2>
        <p className={p.lede}>Failing sources are listed first. Sort by a column heading.</p>
        <div className={p.tableWrap} role="region" aria-label="Sources table, scrollable" tabIndex={0}>
          <table className={p.table} aria-labelledby="sources-h">
            <thead>
              <tr>
                {header("name", "Name")}
                <th scope="col">Type</th>
                {header("tier", "Tier")}
                <th scope="col">Status</th>
                {header("success", "Last success")}
                {header("failures", "Failures")}
                {header("accepted", "Accepted / contributed")}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <th scope="row">
                    <a href={`/pipeline/sources/${s.id}`}>{s.name}</a>
                  </th>
                  <td>{s.type}</td>
                  <td>
                    <TierBadge tier={s.tier} />
                  </td>
                  <td>{s.status}</td>
                  <td>{s.lastSuccessAt ? formatRelative(s.lastSuccessAt) : "never"}</td>
                  <td className={p.num}>{s.failing ? <strong>{s.consecutiveFailures}</strong> : 0}</td>
                  <td className={p.num}>
                    {s.accepted} / {s.contributed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
