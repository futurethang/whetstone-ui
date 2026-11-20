import type { EntryDetail, EntrySummary, Evidence, Feature } from "@/data/models";
import { formatDate, formatMonthYear } from "@/lib/format";
import { Markdown } from "@/ui/Markdown";
import { StatusBadge } from "@/ui/signals/StatusBadge";
import { SupportBadge } from "@/ui/signals/SupportBadge";
import { TierBadge, tierLabel } from "@/ui/signals/TierBadge";
import s from "./Entry.module.css";

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} rel="noopener noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> (opens external site)</span>
    </a>
  );
}

export function VerdictBox({ verdict }: { verdict: string }) {
  return (
    <section id="verdict" className={s.verdict} aria-labelledby="verdict-h">
      <h2 id="verdict-h">Verdict</h2>
      <p>{verdict}</p>
    </section>
  );
}

export function ScopeLists({ appliesWhen, doesNotApplyWhen }: { appliesWhen: string[]; doesNotApplyWhen: string[] }) {
  if (!appliesWhen.length && !doesNotApplyWhen.length) return null;
  return (
    <section id="where-it-applies" className={s.section} aria-labelledby="where-it-applies-h">
      <h2 id="where-it-applies-h">Where it applies</h2>
      <div className={s.scope}>
        <section aria-labelledby="applies-h">
          <h3 id="applies-h">
            <svg viewBox="0 0 16 16" aria-hidden="true" className={s.yes}>
              <circle cx="8" cy="8" r="6.5" className={s.icon} />
              <path d="m5 8.2 2 2 4-4.4" className={s.icon} />
            </svg>
            Applies when
          </h3>
          {appliesWhen.length ? <ul>{appliesWhen.map((x) => <li key={x}>{x}</li>)}</ul> : <p className={s.meta}>Not specified.</p>}
        </section>
        <section aria-labelledby="not-applies-h">
          <h3 id="not-applies-h">
            <svg viewBox="0 0 16 16" aria-hidden="true" className={s.no}>
              <circle cx="8" cy="8" r="6.5" className={s.icon} />
              <path d="m5.5 5.5 5 5m0-5-5 5" className={s.icon} />
            </svg>
            Does not apply when
          </h3>
          {doesNotApplyWhen.length ? <ul>{doesNotApplyWhen.map((x) => <li key={x}>{x}</li>)}</ul> : <p className={s.meta}>Not specified.</p>}
        </section>
      </div>
    </section>
  );
}

/** One row per feature. No per-browser columns in V1. */
export function SupportTable({ features, support }: { features: Feature[]; support: EntrySummary["support"] }) {
  if (!support.length) return null;
  const byId = new Map(features.map((f) => [f.id, f]));
  return (
    <section id="browser-support" className={s.section} aria-labelledby="browser-support-h">
      <h2 id="browser-support-h">Browser support</h2>
      <div className={s.tableWrap} role="region" aria-label="Browser support table, scrollable" tabIndex={0}>
        <table className={s.table} aria-labelledby="browser-support-h">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Baseline</th>
              <th scope="col">Newly available</th>
              <th scope="col">Widely available</th>
              <th scope="col">Spec</th>
            </tr>
          </thead>
          <tbody>
            {support.map((row) => {
              const f = byId.get(row.featureId);
              return (
                <tr key={row.featureId}>
                  <th scope="row">
                    <a href={`/f/${encodeURIComponent(row.featureId)}`}>{f?.name ?? row.featureId}</a>
                  </th>
                  <td>
                    <SupportBadge level={row.level} />
                  </td>
                  <td>{formatMonthYear(row.lowDate) ?? "—"}</td>
                  <td>{formatMonthYear(row.highDate) ?? "—"}</td>
                  <td>
                    {f?.specUrls.length ? (
                      <ul className={s.sources}>
                        {f.specUrls.slice(0, 3).map((u, i) => (
                          <li key={u}>
                            <External href={u}>{f.specUrls.length > 1 ? `Spec ${i + 1}` : "Spec"}</External>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const TIERS = ["normative", "expert", "community"] as const;

/** Parsed evidence rows with a no-JS tier filter (?tier=). */
export function EvidenceList({ items, slug, tier }: { items: Evidence[]; slug: string; tier: string | null }) {
  const parsed = items.filter((i): i is Extract<Evidence, { kind: "parsed" }> => i.kind === "parsed");
  const counts = Object.fromEntries(TIERS.map((t) => [t, parsed.filter((i) => i.tier === t).length]));
  const shown = tier ? items.filter((i) => i.kind === "parsed" && i.tier === tier) : items;
  const options: Array<{ value: string | null; label: string; count: number }> = [
    { value: null, label: "All", count: items.length },
    ...TIERS.map((t) => ({ value: t, label: tierLabel(t), count: counts[t] ?? 0 })),
  ];
  return (
    <>
      <ul className={s.filter} aria-label="Filter evidence by source tier">
        {options.map((o) => (
          <li key={o.label}>
            <a href={`/e/${slug}${o.value ? `?tier=${o.value}` : ""}#evidence`} aria-current={(tier ?? null) === o.value ? "true" : undefined}>
              {o.label} ({o.count})
            </a>
          </li>
        ))}
      </ul>
      {shown.length ? (
        <ul className={s.evidence}>
          {shown.map((i, n) =>
            i.kind === "parsed" ? (
              <li key={`${i.url}-${n}`}>
                <TierBadge tier={i.tier} />
                <div>
                  <p className={s.claim}>{i.claim}</p>
                  <span className={s.meta}>
                    {i.source} · <time dateTime={i.date}>{formatDate(i.date)}</time> · <External href={i.url}>Source</External>
                  </span>
                </div>
              </li>
            ) : (
              <li key={`raw-${n}`}>
                <span className={s.meta}>Note</span>
                <Markdown html={i.html} inline />
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className={s.meta}>No {tierLabel(tier).toLowerCase()} evidence.</p>
      )}
    </>
  );
}

export function SourceList({ sources, tierCounts }: { sources: EntryDetail["sources"]; tierCounts: Record<string, number> }) {
  if (!sources.length) return null;
  return (
    <section id="sources" className={s.section} aria-labelledby="sources-h">
      <h2 id="sources-h">Sources</h2>
      <p className={s.summaryLine}>
        {TIERS.filter((t) => tierCounts[t]).map((t) => (
          <TierBadge key={t} tier={t} count={tierCounts[t]} />
        ))}
      </p>
      <ul className={s.sources}>
        {sources.map((src) => (
          <li key={src.url}>
            <TierBadge tier={src.tier} />
            <External href={src.url}>{src.title}</External>
            {src.retrieved ? <span className={s.meta}>Retrieved {formatDate(src.retrieved)}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Timeline({ history, epochs }: { history: EntryDetail["history"]; epochs: EntryDetail["epochs"] }) {
  return (
    <ol className={s.timeline}>
      {history.map((h, i) => (
        <li key={`${h.date}-${i}`}>
          <time className={s.when} dateTime={h.date}>
            {formatDate(h.date)}
          </time>
          <span className={s.what}>{h.label}</span>
          {h.from && h.to ? (
            <span className={s.transition}>
              <StatusBadge status={h.from} />
              <span aria-hidden="true">→</span>
              <span className="visually-hidden">to</span>
              <StatusBadge status={h.to} />
            </span>
          ) : null}
          {h.note ? <p>{h.note}</p> : null}
        </li>
      ))}
      {epochs.map((e) => (
        <li key={e.period}>
          <details className={s.epoch}>
            <summary>
              <span className={s.what}>{e.period}</span> · earlier history
            </summary>
            <p>{e.summary}</p>
          </details>
        </li>
      ))}
    </ol>
  );
}

export function EntryRail({ entry, titles }: { entry: EntryDetail; titles: Map<string, string> }) {
  const link = (id: string) => (
    <li key={id}>
      <a href={`/e/${id}`}>{titles.get(id) ?? id}</a>
    </li>
  );
  return (
    <aside className={s.rail} aria-label="About this entry">
      {entry.related.length ? (
        <section aria-labelledby="related-h">
          <h2 id="related-h">Related</h2>
          <ul>{entry.related.map(link)}</ul>
        </section>
      ) : null}
      {entry.supersedes.length ? (
        <section aria-labelledby="supersedes-h">
          <h2 id="supersedes-h">Supersedes</h2>
          <ul>{entry.supersedes.map(link)}</ul>
        </section>
      ) : null}
      <section aria-labelledby="details-h">
        <h2 id="details-h">Details</h2>
        <dl>
          <dt>Topics</dt>
          <dd>
            {entry.topics.map((t, i) => (
              <span key={t}>
                {i ? ", " : ""}
                <a href={`/t/${t}`}>{t}</a>
              </span>
            ))}
          </dd>
          {entry.features.length ? (
            <>
              <dt>Features</dt>
              <dd>
                {entry.features.map((f, i) => (
                  <span key={f}>
                    {i ? ", " : ""}
                    <a href={`/f/${encodeURIComponent(f)}`} className={s.mono}>
                      {f}
                    </a>
                  </span>
                ))}
              </dd>
            </>
          ) : null}
          <dt>First seen</dt>
          <dd>{formatDate(entry.firstSeen)}</dd>
          <dt>Last reviewed</dt>
          <dd>{formatDate(entry.lastReviewed)}</dd>
          <dt>Next review</dt>
          <dd>{formatDate(entry.staleness.dueDate)}</dd>
          <dt>Id</dt>
          <dd className={s.mono}>{entry.id}</dd>
        </dl>
      </section>
    </aside>
  );
}
