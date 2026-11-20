import type { EntrySummary } from "@/data/models";

/**
 * V2 seam: Pin, Mute, Mark reviewed, Propose edit will render here (each declaring an ActionKind).
 * Renders nothing in V1, so pages and rows already have the slot.
 */
export function EntryActions(_props: { entry: EntrySummary; placement: "header" | "row" }) {
  return null;
}
