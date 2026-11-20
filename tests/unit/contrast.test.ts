/** Every text/background pairing in tokens.css meets WCAG AA (4.5:1) in both themes. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../../src/styles/tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

const TEXT = ["ink", "muted", "accent", "est", "emg", "con", "dep", "warn"];
const BACKGROUNDS = ["bg", "surface", "subtle"];

const themes = { light: block(":root {"), dark: block(':root[data-theme="dark"]') };

describe.each(Object.entries(themes))("%s theme", (_name, t) => {
  it("defines every token", () => {
    for (const k of [...TEXT, ...BACKGROUNDS, "mark", "rule"]) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/);
  });
  it.each(TEXT.flatMap((fg) => BACKGROUNDS.map((bg) => [fg, bg])))("%s on %s ≥ 4.5:1", (fg, bg) => {
    expect(ratio(t[fg!]!, t[bg!]!)).toBeGreaterThanOrEqual(4.5);
  });
  it("ink on mark (search highlight) ≥ 4.5:1", () => expect(ratio(t.ink!, t.mark!)).toBeGreaterThanOrEqual(4.5));
  it("bg on ink (inverted button) ≥ 4.5:1", () => expect(ratio(t.bg!, t.ink!)).toBeGreaterThanOrEqual(4.5));
});

it("the media-query dark block matches the forced dark block", () => {
  expect(block(':root:not([data-theme="light"])')).toEqual(themes.dark);
});
