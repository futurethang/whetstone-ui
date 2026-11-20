import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfidenceMeter } from "@/ui/signals/ConfidenceMeter";
import { OriginTag } from "@/ui/signals/OriginTag";
import { StaleBadge } from "@/ui/signals/StaleBadge";
import { StatusBadge } from "@/ui/signals/StatusBadge";
import { SupportBadge } from "@/ui/signals/SupportBadge";
import { TierBadge } from "@/ui/signals/TierBadge";
import { UpdatedTag } from "@/ui/signals/UpdatedTag";

const text = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, "");

describe("signals always carry a word, and unknown values render as text", () => {
  it("status", () => {
    expect(text(<StatusBadge status="established" />)).toBe("Established");
    expect(text(<StatusBadge status="speculative" />)).toBe("speculative");
    expect(renderToStaticMarkup(<StatusBadge status="contested" />)).toContain('aria-hidden="true"');
  });
  it("confidence", () => {
    expect(text(<ConfidenceMeter level="high" />)).toBe("High confidence");
    expect(text(<ConfidenceMeter level="high" compact />)).toBe("High confidence");
    expect(text(<ConfidenceMeter level="very-high" />)).toBe("Confidence: very-high");
  });
  it("support", () => {
    expect(text(<SupportBadge level="high" since="2026-06-19" />)).toBe("Widely available since Jun 2026");
    expect(text(<SupportBadge level="low" gap={{ count: 1, total: 3 }} />)).toBe("Newly available · 1 of 3 features");
    expect(text(<SupportBadge level="false" since="2026-01-01" />)).toBe("Limited availability");
    expect(text(<SupportBadge level="maybe" />)).toBe("Support: maybe");
  });
  it("tier, stale, origin, updated", () => {
    expect(text(<TierBadge tier="normative" />)).toBe("NNormative");
    expect(renderToStaticMarkup(<TierBadge tier="expert" />)).toContain('title="Expert source"');
    expect(text(<TierBadge tier="blog" />)).toBe("Tier: blog");
    expect(text(<StaleBadge dueDate="2026-01-01" overdueDays={240} />)).toBe("Stale · 8 months overdue for review");
    expect(text(<OriginTag origin="radar" />)).toBe("Radar");
    expect(text(<OriginTag origin="import" />)).toBe("Origin: import");
    expect(text(<UpdatedTag kind="new" />)).toBe("New since your last visit");
  });
});
