#!/usr/bin/env node
/**
 * V1 allows only these client components (spec, "Performance and JavaScript").
 * app/(app)/error.tsx is required by Next.js: error boundaries must be client components.
 * NavigationPending shows loading feedback after a link click or form submit (docs/decisions.md, Performance).
 * Fails CI if any other file starts with "use client".
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ALLOWED = new Set(["src/ui/search/SearchShortcut.tsx", "src/ui/filters/AutoSubmitFilters.tsx", "app/(app)/error.tsx", "src/ui/feedback/NavigationPending.tsx"]);
const ROOTS = ["app", "src"];
const DIRECTIVE = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/|\s)*["']use client["']/;

const found = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|mjs)$/.test(name) && DIRECTIVE.test(readFileSync(p, "utf8"))) found.push(relative(process.cwd(), p).split(sep).join("/"));
  }
}
for (const r of ROOTS) walk(r);

const extra = found.filter((f) => !ALLOWED.has(f));
console.log(`"use client" files (${found.length}): ${found.join(", ") || "none"}`);
if (extra.length) {
  console.error(`Not allowed in V1: ${extra.join(", ")}. Render on the server, or update the allow-list with a reason.`);
  process.exit(1);
}
