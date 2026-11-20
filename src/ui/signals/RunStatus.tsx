import s from "./Signals.module.css";

const KNOWN: Record<string, { word: string; tone: string }> = {
  succeeded: { word: "Succeeded", tone: s.est! },
  partial: { word: "Partial", tone: s.warn! },
  failed: { word: "Failed", tone: s.con! },
  running: { word: "Running", tone: s.emg! },
  skipped: { word: "Skipped", tone: s.muted! },
};

/** Pipeline run status: icon + word. */
export function RunStatus({ status }: { status: string }) {
  const k = KNOWN[status];
  return (
    <span className={`${s.signal} ${k?.tone ?? s.muted}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {status === "succeeded" ? (
          <>
            <circle cx="8" cy="8" r="6.5" className={s.fill} />
            <path d="m5 8.2 2 2 4-4.4" className={s.knock} />
          </>
        ) : status === "failed" ? (
          <>
            <circle cx="8" cy="8" r="6.5" className={s.fill} />
            <path d="m5.6 5.6 4.8 4.8m0-4.8-4.8 4.8" className={s.knock} />
          </>
        ) : status === "partial" ? (
          <>
            <circle cx="8" cy="8" r="6" className={s.line} />
            <path d="M8 2a6 6 0 0 1 0 12z" className={s.fill} />
          </>
        ) : (
          <circle cx="8" cy="8" r="6" className={`${s.line} ${s.dashed}`} />
        )}
      </svg>
      {k?.word ?? status}
    </span>
  );
}
