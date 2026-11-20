/**
 * V1: evidence is parsed from the body's Evidence section. The pipeline writes one line per item:
 *   - 2026-11-05 · expert · CSS-Tricks · <claim> · [link](https://…)
 * The claim may itself contain " · ", so the line is read from both ends. Lines that do not match come back
 * as { kind: "raw" } and render as markdown. V2 replacement: structured `evidence[]` from the API, same type.
 */
export type ParsedEvidence = { kind: "parsed"; date: string; tier: string; source: string; claim: string; url: string };
export type RawEvidence = { kind: "raw"; raw: string };

const LINE = /^[-*]\s+(\d{4}-\d{2}-\d{2})\s+·\s+([a-z]+)\s+·\s+(.+?)\s+·\s+(.+)\s+·\s+\[[^\]]*\]\((https?:\/\/[^)\s]+)\)\s*$/i;

export function parseEvidenceLine(line: string): ParsedEvidence | RawEvidence {
  const m = LINE.exec(line.trim());
  if (!m) return { kind: "raw", raw: line.trim() };
  return { kind: "parsed", date: m[1]!, tier: m[2]!.toLowerCase(), source: m[3]!.trim(), claim: m[4]!.trim(), url: m[5]! };
}

/** Split a section into list items (continuation lines join their item). */
export function evidenceLines(markdown: string): Array<ParsedEvidence | RawEvidence> {
  const items: string[] = [];
  for (const line of markdown.split("\n")) {
    if (/^\s*[-*]\s+/.test(line)) items.push(line.trim());
    else if (line.trim() && items.length) items[items.length - 1] += ` ${line.trim()}`;
    else if (line.trim()) items.push(line.trim());
  }
  return items.map(parseEvidenceLine);
}
