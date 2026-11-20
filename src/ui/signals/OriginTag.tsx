import type { Origin } from "@/data/models";
import s from "./Signals.module.css";

/** Radar arcs for pipeline-found entries, a pen for the owner's own. */
export function OriginTag({ origin }: { origin: Origin }) {
  const known = origin === "radar" || origin === "personal";
  return (
    <span className={`${s.signal} ${s.muted}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {origin === "radar" ? (
          <>
            <circle cx="3" cy="13" r="1.5" className={s.fill} />
            <path d="M3 8.5a4.5 4.5 0 0 1 4.5 4.5M3 4a9 9 0 0 1 9 9" className={s.line} />
          </>
        ) : origin === "personal" ? (
          <path d="m10.5 2.5 3 3-8 8H2.5v-3zM9 4l3 3" className={s.line} />
        ) : (
          <circle cx="8" cy="8" r="5" className={`${s.line} ${s.dashed}`} />
        )}
      </svg>
      {known ? (origin === "radar" ? "Radar" : "Personal") : `Origin: ${origin || "unknown"}`}
    </span>
  );
}
