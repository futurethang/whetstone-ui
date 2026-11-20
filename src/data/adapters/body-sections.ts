/**
 * Split an entry body into its "## " sections. Known sections are ordered Summary, Arguments, Evidence,
 * Your notes; any other heading follows in source order. HTML comments (pipeline markers) are dropped,
 * and empty sections are skipped.
 */
import type { BodySectionKey } from "../models";

export type RawSection = { key: BodySectionKey; title: string; anchor: string; markdown: string };

const KNOWN: Array<{ key: Exclude<BodySectionKey, "other">; match: RegExp; title: string }> = [
  { key: "summary", match: /^summary$/i, title: "Summary" },
  { key: "arguments", match: /^arguments$/i, title: "Arguments" },
  { key: "evidence", match: /^evidence$/i, title: "Evidence" },
  { key: "notes", match: /^(owner|your)\s+notes$|^notes$/i, title: "Your notes" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";

export function bodySections(body: string): RawSection[] {
  const text = body.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n/g, "\n");
  const parts: Array<{ heading: string | null; lines: string[] }> = [{ heading: null, lines: [] }];
  let fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h = !fence ? /^##\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (h) parts.push({ heading: h[1]!.trim(), lines: [] });
    else parts[parts.length - 1]!.lines.push(line);
  }

  const known: RawSection[] = [];
  const other: RawSection[] = [];
  const used = new Set<string>();
  for (const p of parts) {
    const markdown = p.lines.join("\n").trim();
    if (!markdown) continue;
    const k = p.heading ? KNOWN.find((x) => x.match.test(p.heading!)) : undefined;
    if (k && !used.has(k.key)) {
      used.add(k.key);
      known.push({ key: k.key, title: k.title, anchor: k.key, markdown });
    } else {
      const title = p.heading ?? "Overview";
      let anchor = `section-${slug(title)}`;
      while (used.has(anchor)) anchor += "-2";
      used.add(anchor);
      other.push({ key: "other", title, anchor, markdown });
    }
  }
  const order = KNOWN.map((k) => k.key as string);
  known.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return [...known, ...other];
}
