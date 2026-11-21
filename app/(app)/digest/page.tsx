import type { Metadata } from "next";
import { ApiError } from "@/data/client";
import { getDigests } from "@/data/digest";
import type { Digest, Proposal } from "@/data/models";
import { formatDate, plural } from "@/lib/format";
import { External } from "@/ui/External";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import p from "@/ui/Page.module.css";
import { StatusBadge } from "@/ui/signals/StatusBadge";

export const metadata: Metadata = { title: "Digests" };

const OUTCOME: Record<string, string> = { pending: "Waiting for review", accepted: "Accepted", edited: "Accepted with edits", rejected: "Rejected", superseded: "Replaced by a newer proposal" };
const KIND: Record<string, string> = { new_entry: "New entry", update: "Update", status_change: "Status change", revet: "Re-check" };

const entryIdOf = (d: Proposal) => d.entryId ?? d.path.split("/").pop()!.replace(/\.md$/, "");

function ProposalCard({ d }: { d: Proposal }) {
  const id = entryIdOf(d);
  const live = d.outcome === "accepted" || d.outcome === "edited" || (d.kind !== "new_entry" && d.entryId);
  return (
    <li className={p.card}>
      <h3>{live ? <a href={`/e/${id}`}>{d.entryTitle ?? id}</a> : <span className={p.mono}>{id}</span>}</h3>
      <p className={p.row}>
        <span>{KIND[d.kind] ?? d.kind}</span>
        <strong>{OUTCOME[d.outcome] ?? d.outcome}</strong>
        {d.proposedStatus ? (
          <span>
            Proposed: <StatusBadge status={d.proposedStatus} />
          </span>
        ) : null}
      </p>
      <p>{d.rationale}</p>
      {d.observationIds.length ? (
        <details className={p.disclosure}>
          <summary>Based on {plural(d.observationIds.length, "observation")}</summary>
          <p className={p.row}>
            {d.observationIds.map((o) => (
              <a key={o} href={`/o/${o}`}>
                #{o}
              </a>
            ))}
          </p>
        </details>
      ) : null}
    </li>
  );
}

function DigestSection({ g }: { g: Digest }) {
  const id = `digest-${g.prNumber ?? "unsent"}`;
  const title = g.prNumber ? `Digest ${g.week} · #${g.prNumber}` : "Proposals not yet in a pull request";
  const summary = Object.entries(g.counts)
    .map(([k, n]) => `${n} ${(OUTCOME[k] ?? k).toLowerCase()}`)
    .join(", ");
  return (
    <section aria-labelledby={id} className={p.block}>
      <h2 id={id}>{title}</h2>
      <p className={p.row}>
        <span>{g.state === "open" ? "Open: review it on GitHub" : g.state === "decided" ? `Merged ${formatDate(g.decidedAt)}` : "Not sent"}</span>
        <span>Opened {formatDate(g.createdAt)}</span>
        <span>{summary}</span>
        {g.prUrl ? <External href={g.prUrl}>Pull request #{g.prNumber}</External> : null}
      </p>
      <ol className={p.cards}>
        {g.proposals.map((d) => (
          <ProposalCard key={d.id} d={d} />
        ))}
      </ol>
    </section>
  );
}

/** Read-only: accept, edit and reject happen in the digest pull request on GitHub. */
export default async function DigestPage() {
  let digests: Digest[];
  try {
    digests = await getDigests();
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Digests" />;
    throw e;
  }
  const pending = digests.reduce((a, g) => a + (g.counts.pending ?? 0), 0);
  return (
    <>
      <h1>Digests</h1>
      <p className={p.lede}>
        Each week the pipeline turns observations into proposed changes and opens a pull request called a digest. Merging it adds or updates entries;
        reverting a file in it rejects that proposal. {pending ? `${plural(pending, "proposal")} waiting for your review.` : "Nothing is waiting for review."}
      </p>
      {digests.length ? (
        digests.map((g) => <DigestSection key={g.prNumber ?? "unsent"} g={g} />)
      ) : (
        <EmptyState>
          <p>No digests yet. The first one appears after the weekly job finds something to propose.</p>
        </EmptyState>
      )}
    </>
  );
}
