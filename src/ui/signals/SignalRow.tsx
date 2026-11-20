import type { EntrySummary } from "@/data/models";
import { formatRelative } from "@/lib/format";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { OriginTag } from "./OriginTag";
import { StaleBadge } from "./StaleBadge";
import { StatusBadge } from "./StatusBadge";
import { SupportBadge } from "./SupportBadge";
import { UpdatedTag } from "./UpdatedTag";
import s from "./Signals.module.css";

/** Status, confidence, support, origin, freshness and the Updated tag, as a list so each signal is announced. */
export function SignalRow({ entry, compact = false, showStatus = true, label = "Signals" }: { entry: EntrySummary; compact?: boolean; showStatus?: boolean; label?: string }) {
  const r = entry.supportRollup;
  return (
    <ul className={s.row} aria-label={label}>
      {showStatus ? (
        <li>
          <StatusBadge status={entry.status} size={compact ? "m" : "l"} />
        </li>
      ) : null}
      <li>
        <ConfidenceMeter level={entry.confidence} compact={compact} />
      </li>
      {r ? (
        <li>
          <SupportBadge level={r.level} since={compact ? null : r.since} gap={r.mixed ? { count: r.weakestCount, total: r.total } : null} />
        </li>
      ) : null}
      <li>
        <OriginTag origin={entry.origin} />
      </li>
      <li>
        {entry.staleness.stale ? (
          <StaleBadge dueDate={entry.staleness.dueDate} overdueDays={entry.staleness.overdueDays} />
        ) : (
          <span className={s.reviewed}>Reviewed {formatRelative(entry.lastReviewed)}</span>
        )}
      </li>
      {entry.update ? (
        <li>
          <UpdatedTag kind={entry.update} />
        </li>
      ) : null}
    </ul>
  );
}
