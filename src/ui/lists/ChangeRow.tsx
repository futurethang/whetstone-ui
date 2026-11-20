import type { ChangeSummary } from "@/data/models";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/ui/signals/StatusBadge";
import s from "./Lists.module.css";

/** One change: event label (with from → to for status changes), entry, topic, date, and "+N more". */
export function ChangeRow({ change, topicLabel }: { change: ChangeSummary; topicLabel?: string }) {
  return (
    <li className={s.change}>
      <span className={s.kind}>
        {change.label}
        {change.from && change.to ? (
          <span className={s.transition}>
            <StatusBadge status={change.from} />
            <span aria-hidden="true">→</span>
            <span className="visually-hidden">to</span>
            <StatusBadge status={change.to} />
          </span>
        ) : null}
      </span>
      <a className={s.changeTitle} href={`/e/${change.entryId}`}>
        {change.entryTitle}
      </a>
      <span className={s.meta}>
        {change.entryTopic ? (
          <>
            <a href={`/t/${change.entryTopic}`}>{topicLabel ?? change.entryTopic}</a> ·{" "}
          </>
        ) : null}
        <time dateTime={change.date}>{formatDate(change.date)}</time>
        {change.more ? ` · +${change.more} more` : ""}
      </span>
      {change.note ? <span className={s.note}>{change.note}</span> : null}
    </li>
  );
}
