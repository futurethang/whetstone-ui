import type { ActionKind } from "@/data/models";
import s from "./Signals.module.css";

/**
 * V2 seam, unused in V1: every action button will declare how it takes effect.
 * instant = applies now; commit = writes to the knowledge repo; review = opens a proposal for review.
 */
export function ActionMark({ kind }: { kind: ActionKind }) {
  const word = { instant: "Applies now", commit: "Commits to the repo", review: "Needs review" }[kind];
  return (
    <span className={`${s.signal} ${s.muted}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {kind === "instant" ? <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z" className={s.line} /> : kind === "commit" ? <><circle cx="8" cy="8" r="2.6" className={s.line} /><path d="M1.5 8h3.9M10.6 8h3.9" className={s.line} /></> : <><circle cx="7" cy="7" r="4.5" className={s.line} /><path d="m10.4 10.4 3.6 3.6" className={s.line} /></>}
      </svg>
      {word}
    </span>
  );
}
