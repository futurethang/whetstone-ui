import { formatDate, formatSpan } from "@/lib/format";
import s from "./Signals.module.css";

/** Clock icon, dashed border: "Stale · 8 months" overdue. */
export function StaleBadge({ dueDate, overdueDays }: { dueDate: string; overdueDays: number }) {
  return (
    <span className={`${s.signal} ${s.warn} ${s.stale}`} title={`Review was due ${formatDate(dueDate)}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.2" className={s.line} />
        <path d="M8 4.5V8l2.4 1.6" className={s.line} />
      </svg>
      Stale{overdueDays > 0 ? ` · ${formatSpan(overdueDays)}` : ""}
      <span className="visually-hidden"> overdue for review</span>
    </span>
  );
}
