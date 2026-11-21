/** Plain-language one-liner for a pipeline run, from the stats the job recorded. */

const num = (stats: Record<string, unknown>, key: string): number | null => (typeof stats[key] === "number" ? (stats[key] as number) : null);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What each job does, for people who have never read the spec. */
export const JOBS: Record<string, { label: string; what: string; workflow: "daily" | "weekly" | "monthly" | "on-merge" | "bootstrap"; cadence: string }> = {
  collect: { label: "Collect", what: "Fetch new articles from the sources that are due", workflow: "daily", cadence: "daily 06:17 UTC" },
  extract: { label: "Extract", what: "Judge relevance and pull claims out of new articles", workflow: "daily", cadence: "daily, after collect" },
  "ground-truth": { label: "Ground truth", what: "Refresh Baseline browser-support data", workflow: "daily", cadence: "daily, after extract" },
  sync: { label: "Sync", what: "Mirror knowledge/ from git into the database", workflow: "daily", cadence: "daily, after ground truth" },
  health: { label: "Health", what: "Open or close the pipeline health issue", workflow: "daily", cadence: "after each workflow" },
  funnel: { label: "Funnel", what: "Count where knowledge is lost (no LLM)", workflow: "weekly", cadence: "Mondays 06:37 UTC" },
  distill: { label: "Distill", what: "Turn observations into proposed entry changes (opens a digest PR)", workflow: "weekly", cadence: "Mondays 06:37 UTC" },
  reconcile: { label: "Reconcile", what: "Record which proposals you merged or rejected", workflow: "on-merge", cadence: "when a digest PR closes" },
  compact: { label: "Compact", what: "Roll up old entry history", workflow: "monthly", cadence: "1st of the month" },
  discover: { label: "Discover", what: "Propose new sources", workflow: "monthly", cadence: "1st of the month" },
};

export function summarizeRun(job: string, status: string, stats: Record<string, unknown>, error: string | null): string {
  if (status === "failed" && error) return `Failed: ${error.slice(0, 140)}`;
  const n = (k: string) => num(stats, k);
  switch (job) {
    case "collect": {
      const checked = n("sources"), fresh = n("items_new");
      if (checked === 0) return "No sources were due, so nothing was fetched.";
      const failed = n("sources_failed") ?? 0;
      return `Checked ${plural(checked ?? 0, "source")}, found ${plural(fresh ?? 0, "new article")}${failed ? `; ${failed} failed` : ""}.`;
    }
    case "extract": {
      const seen = n("items") ?? 0;
      if (seen === 0) return "No new articles to read.";
      return `Read ${plural(seen, "article")}: ${n("extracted") ?? 0} relevant, ${n("discarded") ?? 0} discarded${n("failed") ? `, ${n("failed")} failed` : ""}.`;
    }
    case "distill": {
      const pr = n("pr");
      const base = `${plural(n("candidates") ?? 0, "candidate")} (${n("clusters") ?? 0} new-subject clusters); ${n("proposed") ?? 0} proposed, ${n("none") ?? 0} judged no change`;
      return `${base}${pr ? `; digest PR #${pr}` : "; no PR opened"}.`;
    }
    case "sync":
      return `Mirrored ${plural(n("entries") ?? 0, "entry", "entries")} and ${plural(n("sources") ?? 0, "source")}.`;
    case "ground-truth":
      return typeof stats["unchanged"] === "string" ? `Baseline data unchanged (web-features ${stats["unchanged"]}).` : "Baseline data refreshed.";
    case "funnel":
      return `${n("items_total") ?? 0} articles tracked, ${n("observations_open") ?? 0} open observations.`;
    case "reconcile":
      return `${n("accepted") ?? 0} accepted, ${n("edited") ?? 0} edited, ${n("rejected") ?? 0} rejected.`;
    case "health":
      return stats["resolved"] ? "Health issue closed." : "Health issue updated.";
    default:
      return status === "skipped" ? "Skipped." : "";
  }
}
