import type { SupportLevel } from "@/data/models";
import { formatMonthYear } from "@/lib/format";
import s from "./Signals.module.css";

const KNOWN = {
  high: { word: "Widely available", tone: s.est },
  low: { word: "Newly available", tone: s.emg },
  false: { word: "Limited availability", tone: s.con },
} as const;

function Shape({ level }: { level: string }) {
  switch (level) {
    case "high":
      return (
        <>
          <rect x="1.2" y="1.2" width="13.6" height="13.6" rx="3" className={s.fill} />
          <path d="m4.6 8.3 2.2 2.2 4.6-4.9" className={s.knock} />
        </>
      );
    case "low":
      return (
        <>
          <rect x="1.5" y="1.5" width="13" height="13" rx="3" className={s.line} />
          <path d="m4.6 8.3 2.2 2.2 4.6-4.9" className={s.line} />
        </>
      );
    case "false":
      return (
        <>
          <path d="M8 1.6 15 14.2H1z" className={s.line} />
          <path d="M8 6v4" className={s.line} />
          <circle cx="8" cy="12.1" r="0.9" className={s.fill} />
        </>
      );
    default:
      return <rect x="1.5" y="1.5" width="13" height="13" rx="3" className={`${s.line} ${s.dashed}`} />;
  }
}

/**
 * Baseline support: shape + words. `since` adds "since Jun 2026"; `gap` adds "1 of 3 features" when an
 * entry's features are mixed. An unknown level renders its raw value.
 */
export function SupportBadge({ level, since, gap }: { level: SupportLevel; since?: string | null; gap?: { count: number; total: number } | null }) {
  const k = KNOWN[level as keyof typeof KNOWN];
  const when = level !== "false" ? formatMonthYear(since) : null;
  return (
    <span className={`${s.signal} ${k?.tone ?? s.muted}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <Shape level={level} />
      </svg>
      {k ? k.word : `Support: ${level || "unknown"}`}
      {when ? ` since ${when}` : ""}
      {gap ? ` · ${gap.count} of ${gap.total} features` : ""}
    </span>
  );
}
