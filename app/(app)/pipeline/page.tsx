import type { Metadata } from "next";
import { ApiError } from "@/data/client";
import type { Source } from "@/data/models";
import { JOBS, getBudget, getOverview, getRuns, getSources } from "@/data/pipeline";
import { formatAgo, formatDateTime, formatDuration, formatRelative, formatUsd } from "@/lib/format";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { External } from "@/ui/External";
import p from "@/ui/Page.module.css";
import { RunStatus } from "@/ui/signals/RunStatus";
import { TierBadge } from "@/ui/signals/TierBadge";

export const metadata: Metadata = { title: "Pipeline" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const REPO_URL = "https://github.com/futurethang/whetstone";
const OUTCOME: Record<string, string> = { extracted: "Relevant", discarded: "Discarded", fetched: "Not read yet", failed: "Failed to read" };

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
  let budget, runs, sources, overview;
  try {
    [budget, runs, sources, overview] = await Promise.all([getBudget(), getRuns(50), getSources(), getOverview()]);
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Pipeline" />;
    throw e;
  }
  // Failing sources always come first; the chosen sort applies within each group.
  const lastCollect = overview.lastRuns.find((r) => r.job === "collect");
  const sorted = [...sources].sort((a, b) => Number(b.failing) - Number(a.failing) || SORTS[sortKey](a, b) || a.name.localeCompare(b.name));
  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sortKey === key ? (key === "name" || key === "tier" ? "ascending" : "descending") : undefined}>
      <a href={`/pipeline?sort=${key}#sources-h`}>{label}</a>
    </th>
  );

  return (
    <>
      <h1>Pipeline</h1>
      <p className={p.lede}>What the backend has been doing, where each article went, and what is waiting for you. Times are UTC.</p>

      <section aria-labelledby="now-h" className={p.block}>
        <h2 id="now-h">Right now</h2>
        <dl className={p.facts}>
          <dt>Last collection</dt>
          <dd>{lastCollect ? `${formatAgo(lastCollect.startedAt)}: ${lastCollect.summary}` : "never run"}</dd>
          <dt>New articles</dt>
          <dd>
            {overview.items.fetched24h} in the last 24 hours, {overview.items.fetched7d} in the last 7 days
          </dd>
          <dt>Waiting for the weekly digest</dt>
          <dd>
            {overview.observations.byStatus.open ?? 0} open observations ({overview.observations.openUnlinked} not tied to an existing entry)
          </dd>
          <dt>Proposals awaiting your review</dt>
          <dd>{overview.proposals.pending ?? 0}</dd>
          <dt>Sources</dt>
          <dd>
            {overview.sources.active} active, {overview.sources.failing} failing{overview.sources.neverSucceeded ? `, ${overview.sources.neverSucceeded} never fetched` : ""}
          </dd>
        </dl>
        <p className={p.lede}>
          New entries only appear after the weekly digest opens a pull request and you merge it. Everything above that line is visible here as soon as it is collected.
        </p>
      </section>

      <section aria-labelledby="funnel-h" className={p.block}>
        <h2 id="funnel-h">How articles become knowledge</h2>
        <div className={p.tableWrap} role="region" aria-label="Funnel table, scrollable" tabIndex={0}>
          <table className={p.table} aria-labelledby="funnel-h">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col" className={p.num}>Count</th>
                <th scope="col">What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">Articles fetched</th><td className={p.num}>{overview.items.total}</td><td>Everything collected from sources that is still retained</td></tr>
              <tr><th scope="row">Judged relevant</th><td className={p.num}>{overview.items.byState.extracted ?? 0}</td><td>Claims were pulled out as observations</td></tr>
              <tr><th scope="row">Discarded</th><td className={p.num}>{overview.items.byState.discarded ?? 0}</td><td>Off-topic, job posts, or too thin</td></tr>
              <tr><th scope="row">Not read yet</th><td className={p.num}>{(overview.items.byState.fetched ?? 0) + (overview.items.byState.failed ?? 0)}</td><td>Waiting for the next extract run ({overview.items.byState.failed ?? 0} failed)</td></tr>
              <tr><th scope="row">Observations, open</th><td className={p.num}>{overview.observations.byStatus.open ?? 0}</td><td>{overview.observations.openLinked} point at an existing entry, {overview.observations.openUnlinked} are candidates for new entries</td></tr>
              <tr><th scope="row">Observations, used</th><td className={p.num}>{overview.observations.byStatus.consumed ?? 0}</td><td>Already folded into a proposal</td></tr>
              <tr><th scope="row">Proposals</th><td className={p.num}>{Object.values(overview.proposals).reduce((a, b) => a + b, 0)}</td><td>{Object.entries(overview.proposals).map(([k, v]) => `${v} ${k}`).join(", ") || "none yet"}</td></tr>
            </tbody>
          </table>
        </div>
        {overview.discardReasons.length ? (
          <details className={p.disclosure}>
            <summary>Why articles were discarded or failed</summary>
            <ul>
              {overview.discardReasons.map(([reason, n]) => (
                <li key={reason}>
                  {n} × {reason}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {overview.observations.openByTopic.length ? (
          <details className={p.disclosure}>
            <summary>Open observations by topic</summary>
            <ul>
              {overview.observations.openByTopic.map(([topic, n]) => (
                <li key={topic}>
                  <a href={`/t/${topic}`}>{topic}</a>: {n}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section aria-labelledby="jobs-h" className={p.block}>
        <h2 id="jobs-h">Jobs</h2>
        <p className={p.lede}>
          Jobs run on GitHub Actions on the schedule shown. “Run it” opens the workflow page, where <strong>Run workflow</strong> starts it now.
        </p>
        <div className={p.tableWrap} role="region" aria-label="Jobs table, scrollable" tabIndex={0}>
          <table className={p.table} aria-labelledby="jobs-h">
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Schedule</th>
                <th scope="col">Last run</th>
                <th scope="col">Result</th>
                <th scope="col">Start</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(JOBS).map(([job, info]) => {
                const r = overview.lastRuns.find((x) => x.job === job);
                return (
                  <tr key={job}>
                    <th scope="row">
                      {info.label}
                      <br />
                      <small>{info.what}</small>
                    </th>
                    <td>{info.cadence}</td>
                    <td>
                      {r ? (
                        <>
                          <RunStatus status={r.status} /> <time dateTime={r.startedAt} title={formatDateTime(r.startedAt)}>{formatAgo(r.startedAt)}</time>
                        </>
                      ) : (
                        "never"
                      )}
                    </td>
                    <td>{r ? r.summary : "—"}</td>
                    <td>{info.workflow === "bootstrap" ? null : <External href={`${REPO_URL}/actions/workflows/${info.workflow}.yml`}>Run it</External>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="items-h" className={p.block}>
        <h2 id="items-h">Latest articles</h2>
        <div className={p.tableWrap} role="region" aria-label="Latest articles table, scrollable" tabIndex={0}>
          <table className={p.table} aria-labelledby="items-h">
            <thead>
              <tr>
                <th scope="col">Article</th>
                <th scope="col">Source</th>
                <th scope="col">Fetched</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentItems.map((i) => (
                <tr key={i.id}>
                  <th scope="row">
                    <a href={`/i/${i.id}`}>{i.title ?? i.url}</a>
                  </th>
                  <td>{i.sourceId ? <a href={`/pipeline/sources/${i.sourceId}`}>{i.sourceName ?? i.sourceId}</a> : "—"}</td>
                  <td>
                    <time dateTime={i.fetchedAt} title={formatDateTime(i.fetchedAt)}>{formatAgo(i.fetchedAt)}</time>
                  </td>
                  <td>{OUTCOME[i.state] ?? i.state}{i.state === "discarded" && i.reason ? ` (${i.reason.replace(/^prefilter:\s*/, "")})` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
        <h2 id="runs-h">Run history</h2>
        <details className={p.disclosure}>
        <summary>Show the last {runs.length} runs</summary>
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
        </details>
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
