/**
 * Topic ids carry no labels in the data layer, so labels are derived here: an override for words that
 * sentence case gets wrong, otherwise the last id segment in sentence case ("color-and-typography" → "Color and typography").
 */
const OVERRIDES: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  typescript: "TypeScript",
  "web-apis": "Web APIs",
  "dom-and-events": "DOM and events",
  "security-web": "Web security",
  "ai-tooling": "AI tooling",
};

/** Words that keep their own casing inside a label. */
const WORDS: Record<string, string> = { css: "CSS", html: "HTML", api: "API", apis: "APIs", dom: "DOM", ai: "AI", javascript: "JavaScript", typescript: "TypeScript", baseline: "Baseline" };

export function topicLabel(id: string): string {
  if (OVERRIDES[id]) return OVERRIDES[id];
  const last = id.split("/").pop() ?? id;
  if (OVERRIDES[last]) return OVERRIDES[last];
  return last
    .split("-")
    .map((w, i) => WORDS[w] ?? (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
