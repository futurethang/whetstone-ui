/** Classifies a source as broken, never fetched, quiet or healthy, with advice the owner can act on. */

export type SourceHealth = "broken" | "never" | "quiet" | "ok";

const QUIET_AFTER_DAYS = 45;
const DAY = 86_400_000;

export const HEALTH_LABEL: Record<SourceHealth, string> = {
  broken: "Failing",
  never: "Never fetched",
  quiet: "Quiet",
  ok: "Healthy",
};

export function adviceForError(error: string | null): string {
  const e = (error ?? "").toLowerCase();
  if (!e) return "The last attempt failed with no message. Check the Actions log of the daily run.";
  if (e.includes("no feed discovered")) return "The site has no RSS or Atom link we can find. Set an explicit feed: URL in the registry, or retire the source if it publishes none.";
  if (e.includes("too large")) return "The feed is bigger than the size limit. Point feed: at a smaller feed, or raise the limit.";
  if (e.includes("too many redirects")) return "The feed URL redirects in a chain. Set feed: to the final URL.";
  if (/\b(401|403)\b/.test(e)) return "The site refuses automated requests. Try another feed URL or retire the source.";
  if (/\b(404|410)\b/.test(e)) return "The URL no longer exists. Find the new feed URL and set feed: in the registry.";
  if (/timeout|timed out|enotfound|fetch failed|econn/.test(e)) return "Network problem or the host is down. It retries on the next run; retire it if it stays down.";
  return "Open the registry entry and check the URL, or retire the source.";
}

export function classifyHealth(s: { type: string; consecutiveFailures: number; lastSuccessAt: string | null; lastItemAt: string | null; lastError: string | null }, now = new Date()): { health: SourceHealth; advice: string | null } {
  if (s.consecutiveFailures > 0) return { health: "broken", advice: adviceForError(s.lastError) };
  // Sources that publish data rather than articles never produce items.
  if (s.type === "web-features") return { health: "ok", advice: null };
  if (!s.lastSuccessAt) return { health: "never", advice: "It has not been fetched yet. It runs at the next daily collection." };
  const last = s.lastItemAt ? Date.parse(s.lastItemAt) : NaN;
  if (!Number.isFinite(last)) return { health: "quiet", advice: "Fetched fine but has never produced an article. The feed may be empty, abandoned or the wrong URL." };
  const days = Math.floor((now.getTime() - last) / DAY);
  if (days > QUIET_AFTER_DAYS) return { health: "quiet", advice: `Fetched fine, but its newest article is ${days} days old. It may have stopped publishing.` };
  return { health: "ok", advice: null };
}
