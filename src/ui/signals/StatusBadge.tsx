import type { Status } from "@/data/models";
import s from "./Signals.module.css";

const KNOWN = {
  established: { word: "Established", tone: s.est },
  emerging: { word: "Emerging", tone: s.emg },
  contested: { word: "Contested", tone: s.con },
  deprecated: { word: "Deprecated", tone: s.dep },
} as const;

function Shape({ status }: { status: string }) {
  switch (status) {
    case "established":
      return <circle cx="8" cy="8" r="6.5" className={s.fill} />;
    case "emerging":
      return (
        <>
          <circle cx="8" cy="8" r="6" className={s.line} />
          <path d="M8 2a6 6 0 0 0 0 12z" className={s.fill} />
        </>
      );
    case "contested":
      return (
        <>
          <path d="M8 1.2 14.8 8 8 14.8 1.2 8z" className={s.line} />
          <path d="M8 1.2 1.2 8 8 14.8z" className={s.fill} />
        </>
      );
    case "deprecated":
      return (
        <>
          <circle cx="8" cy="8" r="6" className={s.line} />
          <path d="M3.8 12.2 12.2 3.8" className={s.line} />
        </>
      );
    default:
      return <circle cx="8" cy="8" r="6" className={`${s.line} ${s.dashed}`} />;
  }
}

/** Status: shape + word. An unknown status renders its raw value as text. */
export function StatusBadge({ status, size = "m" }: { status: Status; size?: "m" | "l" }) {
  const k = KNOWN[status as keyof typeof KNOWN];
  return (
    <span className={`${s.signal} ${k?.tone ?? s.muted} ${size === "l" ? s.l : ""}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <Shape status={status} />
      </svg>
      {k?.word ?? (status || "Unknown status")}
    </span>
  );
}

export function statusWord(status: Status): string {
  return KNOWN[status as keyof typeof KNOWN]?.word ?? status;
}
