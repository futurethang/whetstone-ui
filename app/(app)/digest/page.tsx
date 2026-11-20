import type { Metadata } from "next";
import { ApiError } from "@/data/client";
import { getPendingProposals } from "@/data/digest";
import { formatDate, plural } from "@/lib/format";
import { External } from "@/ui/External";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import { EmptyState } from "@/ui/feedback/EmptyState";
import p from "@/ui/Page.module.css";
import { StatusBadge } from "@/ui/signals/StatusBadge";

export const metadata: Metadata = { title: "Digest" };

/** Read-only in V1: accept, edit and reject happen in the GitHub pull request. */
export default async function DigestPage() {
  let proposals;
  try {
    proposals = await getPendingProposals();
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Digest" />;
    throw e;
  }
  return (
    <>
      <h1>Digest</h1>
      <p className={p.unreviewed}>Unreviewed pipeline proposals</p>
      <p className={p.lede}>{plural(proposals.length, "proposal")} pending. Review them in the digest pull request on GitHub.</p>
      {proposals.length ? (
        <ol className={p.cards}>
          {proposals.map((d) => (
            <li key={d.id} className={p.card}>
              <h2>{d.entryId ? <a href={`/e/${d.entryId}`}>{d.entryTitle ?? d.entryId}</a> : <>New entry: <span className={p.mono}>{d.path.split("/").pop()}</span></>}</h2>
              <p className={p.row}>
                <span>{d.kind.replace(/_/g, " ")}</span>
                {d.proposedStatus ? (
                  <span>
                    Proposed: <StatusBadge status={d.proposedStatus} />
                  </span>
                ) : null}
                <span>Score {d.score.toFixed(1)}</span>
                <span>{formatDate(d.createdAt)}</span>
                {d.prUrl ? <External href={d.prUrl}>Pull request #{d.prNumber}</External> : null}
              </p>
              <p>{d.rationale}</p>
              {d.observationIds.length ? (
                <p className={p.row}>
                  Based on:{" "}
                  {d.observationIds.map((o, i) => (
                    <span key={o}>
                      {i ? ", " : ""}
                      <a href={`/o/${o}`}>observation {o}</a>
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>
          <p>No proposals are pending.</p>
        </EmptyState>
      )}
    </>
  );
}
