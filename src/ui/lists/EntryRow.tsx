import type { EntrySummary } from "@/data/models";
import { EntryActions } from "@/ui/entry/EntryActions";
import { SignalRow } from "@/ui/signals/SignalRow";
import s from "./EntryRow.module.css";

type Heading = "h2" | "h3" | "h4";

/** An entry in a list. Full: title, verdict lead (serif), signals. Compact: title and signals only. */
export function EntryRow({ entry, as = "h3", variant = "full", showStatus = true, title, extra }: { entry: EntrySummary; as?: Heading; variant?: "full" | "compact"; showStatus?: boolean; title?: React.ReactNode; extra?: React.ReactNode }) {
  const H = as;
  return (
    <article className={`${s.row} ${variant === "compact" ? s.compact : ""}`}>
      <H className={s.title}>
        <a href={`/e/${entry.slug}`}>{title ?? entry.title}</a>
      </H>
      {variant === "full" ? <p className={s.verdict}>{entry.verdictLead}</p> : null}
      {extra}
      <SignalRow entry={entry} compact showStatus={showStatus} label={`Signals for ${entry.title}`} />
      <EntryActions entry={entry} placement="row" />
    </article>
  );
}
