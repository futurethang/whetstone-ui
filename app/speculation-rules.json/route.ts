/**
 * Speculation Rules for owner pages, linked from the Speculation-Rules response header that proxy.ts sets.
 * Chromium browsers prerender a same-origin page when the pointer rests on its link (~200 ms) or on pointerdown,
 * so the click usually shows the page at once. Other browsers ignore the header. No inline script, so the nonce
 * CSP and the no-dangerouslySetInnerHTML rule are untouched. API routes (sign-out, theme, last visit) and sign-in
 * are never speculated: they are POST targets or change state.
 */
export const dynamic = "force-static";

const PAGES = {
  and: [
    { href_matches: "/*" },
    { not: { href_matches: "/api/*" } },
    { not: { href_matches: "/signin" } },
    { not: { href_matches: "/speculation-rules.json" } },
    { not: { selector_matches: "[rel~=nofollow], [download]" } },
  ],
};

// Prerender on hover; the prefetch rule is the fallback when Chrome declines a prerender (memory, Save-Data,
// DevTools attached), so the HTML is at least already downloaded.
const RULES = {
  prerender: [{ where: PAGES, eagerness: "moderate" }],
  prefetch: [{ where: PAGES, eagerness: "moderate" }],
};

export function GET() {
  return new Response(JSON.stringify(RULES), {
    headers: { "content-type": "application/speculationrules+json", "cache-control": "public, max-age=3600" },
  });
}
