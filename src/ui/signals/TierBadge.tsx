import type { Tier } from "@/data/models";
import s from "./Signals.module.css";

const KNOWN = {
  normative: { letter: "N", label: "Normative", box: s.tierN },
  expert: { letter: "E", label: "Expert", box: s.tierE },
  community: { letter: "C", label: "Community", box: s.tierC },
} as const;

/** Source tier: N filled square, E outlined, C dashed. The full label is in `title` and visually hidden text. */
export function TierBadge({ tier, count }: { tier: Tier | null; count?: number }) {
  const k = tier ? KNOWN[tier as keyof typeof KNOWN] : undefined;
  if (!k) return <span className={`${s.signal} ${s.muted}`}>{tier ? `Tier: ${tier}` : "No tier"}{count !== undefined ? ` ${count}` : ""}</span>;
  return (
    <span className={`${s.signal} ${s.tier}`} title={`${k.label} source${count !== undefined ? `s: ${count}` : ""}`}>
      <span className={`${s.tierBox} ${k.box}`} aria-hidden="true">
        {k.letter}
      </span>
      <span className="visually-hidden">{k.label}</span>
      {count !== undefined ? (
        <>
          {" "}
          {count}
          <span className="visually-hidden"> {count === 1 ? "source" : "sources"}</span>
        </>
      ) : null}
    </span>
  );
}

export function tierLabel(tier: string | null): string {
  return tier ? (KNOWN[tier as keyof typeof KNOWN]?.label ?? tier) : "Unknown";
}
