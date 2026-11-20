import type { Confidence } from "@/data/models";
import s from "./Signals.module.css";

const LEVEL: Record<string, { n: number; word: string }> = { low: { n: 1, word: "Low" }, medium: { n: 2, word: "Medium" }, high: { n: 3, word: "High" } };

/** Three rising bars filled to the level, ink colour only. Compact shows "High" with "confidence" for screen readers. */
export function ConfidenceMeter({ level, compact = false }: { level: Confidence; compact?: boolean }) {
  const k = LEVEL[level];
  const bars = [5, 9, 13];
  return (
    <span className={`${s.signal} ${s.ink}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {bars.map((h, i) => (
          <rect key={h} x={1 + i * 5} y={15 - h} width="3.6" height={h} rx="0.8" className={k && i < k.n ? s.fill : s.empty} />
        ))}
      </svg>
      {k ? (
        compact ? (
          <>
            {k.word}
            <span className="visually-hidden"> confidence</span>
          </>
        ) : (
          `${k.word} confidence`
        )
      ) : (
        `Confidence: ${level || "unknown"}`
      )}
    </span>
  );
}
