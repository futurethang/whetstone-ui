import type { Metadata } from "next";
import { ApiError } from "@/data/client";
import type { FacetOption, SearchOutcome } from "@/data/models";
import { parseSearchParams, searchEntries } from "@/data/search";
import { plural } from "@/lib/format";
import { getLastVisit } from "@/lib/last-visit";
import { activeChips, clearFiltersHref, searchHref } from "@/lib/search-url";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { EntryRow } from "@/ui/lists/EntryRow";
import { Pagination } from "@/ui/lists/Pagination";
import { Highlight } from "@/ui/search/Highlight";
import s from "./search.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = parseSearchParams(await searchParams);
  return { title: p.q ? `Search: ${p.q}` : "Search" };
}

function FilterGroup({ name, legend, options, type = "checkbox" }: { name: string; legend: string; options: FacetOption[]; type?: "checkbox" | "radio" }) {
  if (!options.length) return null;
  return (
    <fieldset className={s.group}>
      <legend>{legend}</legend>
      {type === "radio" ? (
        <label>
          <input type="radio" name={name} value="" defaultChecked={!options.some((o) => o.selected)} /> Any time
        </label>
      ) : null}
      {options.map((o) => (
        <label key={o.value}>
          <input type={type} name={name} value={o.value} defaultChecked={o.selected} /> {o.label} <span className={s.count}>({o.count})</span>
        </label>
      ))}
    </fieldset>
  );
}

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "changed", label: "Recently changed" },
  { value: "overdue", label: "Most overdue" },
  { value: "title", label: "Title" },
];

export default async function SearchPage({ searchParams }: Props) {
  const [raw, lastVisit] = await Promise.all([searchParams, getLastVisit()]);
  const params = parseSearchParams(raw);
  let out: SearchOutcome;
  try {
    out = await searchEntries(params, { lastVisitDay: lastVisit?.day ?? null });
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Search" />;
    throw e;
  }
  const { facets, results, total } = out;
  const p = out.params;
  const facetLabel = (group: string, value: string) => (facets[group as keyof typeof facets] ?? []).find((o) => o.value === value)?.label ?? value;
  const chips = activeChips(p, facetLabel);
  const topicLabel = new Map(facets.topic.map((t) => [t.value, t.label]));
  const sorts = p.q ? SORTS : SORTS.filter((x) => x.value !== "relevance");

  return (
    <>
      <h1>Search</h1>
      <form id="search-form" action="/search" method="get" className={s.layout}>
        <div className={s.query}>
          <label htmlFor="search-q" className="visually-hidden">
            Search entries
          </label>
          <input id="search-q" name="q" type="search" defaultValue={p.q} placeholder="Search titles, verdicts and bodies" autoComplete="off" enterKeyHint="search" />
          <button type="submit">Search</button>
        </div>

        <aside className={s.filters} aria-labelledby="filters-h">
          <h2 id="filters-h">Filters</h2>
          <FilterGroup name="status" legend="Status" options={facets.status} />
          <FilterGroup name="confidence" legend="Confidence" options={facets.confidence} />
          <FilterGroup name="support" legend="Browser support" options={facets.support} />
          <FilterGroup name="stale" legend="Freshness" options={facets.stale} />
          <FilterGroup name="changed" legend="Changed" options={facets.changed} type="radio" />
          <FilterGroup name="origin" legend="Origin" options={facets.origin} />
          <FilterGroup name="topic" legend="Topic" options={facets.topic} />
          <button type="submit" className={s.apply}>
            Apply filters
          </button>
        </aside>

        <section className={s.results} aria-labelledby="results-h">
          <div className={s.resultsHead}>
            <h2 id="results-h">
              {plural(total, "result")}
              {p.q ? (
                <>
                  {" "}
                  for <q>{p.q}</q>
                </>
              ) : null}
            </h2>
            <div className={s.sort}>
              <label htmlFor="sort">Sort by</label>
              <select id="sort" name="sort" defaultValue={p.sort}>
                {sorts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button type="submit">Sort</button>
            </div>
          </div>

          {chips.length ? (
            <div className={s.chips}>
              <ul aria-label="Active filters">
                {chips.map((c) => (
                  <li key={c.key}>
                    <a href={c.href}>
                      {c.label}
                      <span aria-hidden="true"> ×</span>
                      <span className="visually-hidden"> (remove filter)</span>
                    </a>
                  </li>
                ))}
              </ul>
              <a href={clearFiltersHref(p)} className={s.clear}>
                Clear all
              </a>
            </div>
          ) : null}

          {results.length ? (
            <div>
              {results.map(({ entry }) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  as="h3"
                  title={<Highlight text={entry.title} query={p.q} />}
                  extra={
                    entry.primaryTopic ? (
                      <p className={s.path}>
                        <a href={`/t/${entry.primaryTopic}`}>{topicLabel.get(entry.primaryTopic) ?? entry.primaryTopic}</a>
                      </p>
                    ) : null
                  }
                />
              ))}
              <Pagination page={out.page} pageCount={out.pageCount} href={(n) => searchHref(p, { page: n })} label="Search result pages" />
            </div>
          ) : (
            <EmptyState>
              <p>
                No entries match{p.q ? <> <q>{p.q}</q></> : ""}
                {chips.length ? ` with ${chips.map((c) => c.label).join(", ")}` : ""}.
              </p>
              {chips.length ? (
                <p>
                  <a href={chips[chips.length - 1]!.href}>Remove “{chips[chips.length - 1]!.label}”</a> or <a href={clearFiltersHref(p)}>clear all filters</a>.
                </p>
              ) : p.q ? (
                <p>Try fewer or different words.</p>
              ) : null}
            </EmptyState>
          )}
        </section>
      </form>
    </>
  );
}
