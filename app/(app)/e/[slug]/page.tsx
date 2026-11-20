import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/data/client";
import { entryMap, getEntry } from "@/data/entries";
import type { EntryDetail } from "@/data/models";
import { getTopics } from "@/data/topics";
import { getLastVisit } from "@/lib/last-visit";
import { Collapsible } from "@/ui/entry/Collapsible";
import { EntryActions } from "@/ui/entry/EntryActions";
import { EntryRail, EvidenceList, ScopeLists, SourceList, SupportTable, Timeline, VerdictBox } from "@/ui/entry/EntryParts";
import s from "@/ui/entry/Entry.module.css";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import n from "@/ui/feedback/Notice.module.css";
import { Breadcrumb } from "@/ui/layout/Breadcrumb";
import { Markdown } from "@/ui/Markdown";
import { SignalRow } from "@/ui/signals/SignalRow";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const TIERS = new Set(["normative", "expert", "community"]);
const COLLAPSE = new Set(["summary", "arguments", "notes"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const e = await getEntry(slug);
    return { title: e ? e.title : "Entry not found" };
  } catch {
    return { title: "Entry" };
  }
}

function tocItems(e: EntryDetail) {
  const items = [
    { href: "#verdict", label: "Verdict" },
    ...(e.appliesWhen.length || e.doesNotApplyWhen.length ? [{ href: "#where-it-applies", label: "Where it applies" }] : []),
    ...(e.support.length ? [{ href: "#browser-support", label: "Browser support" }] : []),
    ...e.sections.map((x) => ({ href: `#${x.anchor}`, label: x.title })),
    ...(e.sources.length ? [{ href: "#sources", label: "Sources" }] : []),
    { href: "#history", label: "History" },
  ];
  return items;
}

export default async function EntryPage({ params, searchParams }: Props) {
  const [{ slug }, sp, lastVisit] = await Promise.all([params, searchParams, getLastVisit()]);
  const tierParam = typeof sp.tier === "string" && TIERS.has(sp.tier) ? sp.tier : null;

  let entry: EntryDetail | null;
  let titles: Map<string, string>;
  let topicLabels: Map<string, string>;
  try {
    const [e, map, topics] = await Promise.all([getEntry(slug, { lastVisitDay: lastVisit?.day }), entryMap(), getTopics()]);
    entry = e;
    titles = new Map([...map.values()].map((x) => [x.id, x.title]));
    topicLabels = new Map(topics.map((t) => [t.id, t.label]));
  } catch (err) {
    if (err instanceof ApiError) return <ApiNotice error={err} heading="Entry" />;
    throw err;
  }
  if (!entry) notFound();

  const crumbs = [{ href: "/", label: "Home" }];
  if (entry.primaryTopic) {
    const segs = entry.primaryTopic.split("/");
    segs.forEach((_, i) => {
      const id = segs.slice(0, i + 1).join("/");
      crumbs.push({ href: `/t/${id}`, label: topicLabels.get(id) ?? id });
    });
  }
  const toc = tocItems(entry);

  return (
    <div className={s.layout}>
      <nav className={s.toc} aria-label="On this page">
        <h2>On this page</h2>
        <ul>
          {toc.map((t) => (
            <li key={t.href}>
              <a href={t.href}>{t.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <article aria-labelledby="entry-title">
        <header className={s.header}>
          <Breadcrumb items={crumbs} />
          <h1 id="entry-title">{entry.title}</h1>
          <div className={s.signals}>
            <SignalRow entry={entry} label="Entry signals" />
          </div>
          <EntryActions entry={entry} placement="header" />
          <details className={s.jump}>
            <summary>Jump to section</summary>
            <nav aria-label="Jump to section">
              <ul>
                {toc.map((t) => (
                  <li key={t.href}>
                    <a href={t.href}>{t.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </header>

        {entry.supersededBy ? (
          <p className={n.banner} role="note">
            Superseded by <a href={`/e/${entry.supersededBy}`}>{titles.get(entry.supersededBy) ?? entry.supersededBy}</a>
          </p>
        ) : null}

        <VerdictBox verdict={entry.verdict} />
        <ScopeLists appliesWhen={entry.appliesWhen} doesNotApplyWhen={entry.doesNotApplyWhen} />
        <SupportTable features={entry.featureDetails} support={entry.support} />

        {entry.sections.map((sec) =>
          sec.key === "evidence" ? (
            <section key={sec.anchor} id="evidence" className={s.section} aria-labelledby="evidence-h">
              <h2 id="evidence-h">Evidence</h2>
              {entry.evidence.parsed ? <EvidenceList items={entry.evidence.items} slug={entry.slug} tier={tierParam} /> : <Markdown html={sec.html} />}
            </section>
          ) : COLLAPSE.has(sec.key) ? (
            <Collapsible key={sec.anchor} id={sec.anchor} title={sec.title}>
              <Markdown html={sec.html} />
            </Collapsible>
          ) : (
            <section key={sec.anchor} id={sec.anchor} className={s.section} aria-labelledby={`${sec.anchor}-h`}>
              <h2 id={`${sec.anchor}-h`}>{sec.title}</h2>
              <Markdown html={sec.html} />
            </section>
          ),
        )}

        <SourceList sources={entry.sources} tierCounts={entry.tierCounts} />

        <Collapsible id="history" title="History">
          {entry.history.length || entry.epochs.length ? <Timeline history={entry.history} epochs={entry.epochs} /> : <p>No history recorded.</p>}
        </Collapsible>
      </article>

      <EntryRail entry={entry} titles={titles} />
    </div>
  );
}
