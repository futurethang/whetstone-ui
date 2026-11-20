/** Generic labels for history event kinds. V2 typed events ("Verdict reworded") would add detail here. */
const LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  status_change: "Status change",
  owner_note: "Owner note",
  revet_proposed: "Re-vetted",
  reviewed: "Reviewed",
  epoch: "Earlier history",
};

export function eventLabel(kind: string): string {
  if (LABELS[kind]) return LABELS[kind];
  const words = kind.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Change";
}
