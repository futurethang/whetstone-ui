# Decisions

Settled decisions that the V1 UI specification does not cover, or where this repo departs from it. Newest last.

## Milestone 2 (2026-11-20)

- **GitHub sign-in instead of an Auth.js email magic link.** A magic link needs an email-sending service and its key. GitHub OAuth needs only an OAuth app, and the owner's GitHub 2FA protects the site. Auth.js v5 is still beta (`5.0.0-beta.32`), so sign-in uses `arctic` (OAuth client) and `jose` (signed session JWT) directly. There is still no auth database, and the env var names (`AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`) match the Auth.js conventions. Only `OWNER_GITHUB_ID` (numeric, because usernames can be renamed) is admitted.
- **Sign-in starts from a link, not a form.** CSP `form-action 'self'` also applies to redirects after a form submission, which would block the hop to github.com.
- **`style-src` includes the nonce.** Next.js 16 puts the request nonce on the inline styles it generates. Without the nonce those styles are blocked. Inline `style` attributes stay blocked, and ESLint forbids them.
- **Three client components, not two.** Next.js requires `error.tsx` to be a client component. The allow-list is `SearchShortcut`, `AutoSubmitFilters` and `app/(app)/error.tsx`.
- **API failures render server-side.** In production, Next.js hides server error messages from `error.tsx`, so pages catch `ApiError` and render `ApiNotice`, which names the failing source. `error.tsx` is the generic fallback.
- **API base.** `WHETSTONE_API_URL` is the data app's `/api` root; the client adds `/v1/<path>`. The client accepts both `{ error: "message" }` (current) and `{ error: { code, message } }`.
- **Revalidation expires immediately.** `/api/revalidate` calls `revalidateTag(tag, { expire: 0 })`. Next.js 16 deprecates the single-argument form, and `'max'` would serve stale content once.
- **Topic labels are sentence case**, derived from the id with overrides for acronyms and proper names (`css` → CSS, `baseline` → Baseline).
- **Pages are dynamic.** The root layout reads the theme cookie, which also satisfies the per-request nonce requirement.

## Milestones 3–6 (2026-11-20)

- **No `loading.tsx`.** A streamed loading fallback is swapped for content by a script, so without JavaScript the page stays on "Loading…". The swap also shifts layout. Both are release blockers in the spec, so pages render once their data resolves.
- **No `AutoSubmitFilters`.** Submitting the filter form on change reloads the page and moves focus, which fails WCAG 3.2.2 (On Input). The spec made it optional; filters use an Apply button. The allow-list keeps the name reserved.
- **Topic page: "Show deprecated" (off) instead of "Hide deprecated" (on).** Same default behaviour, but an unchecked checkbox is not submitted, so the inverse wording is the one that works without JavaScript.
- **Entry URLs use the id.** The data layer has no separate slug; ids are already slug-shaped (`/e/container-queries-for-component-layout`).
- **Last visit is day-granular, events after the last-visit day.** History dates have no time. After "Mark all seen", events dated today count as seen, so the Updated tags disappear (an acceptance criterion). An event recorded later the same day is not flagged.
- **`last-visit.ts` lives in `src/lib`, not `src/data`.** It reads cookies through Next.js, and `src/data` stays free of Next.js. Data functions take the last-visit day as a parameter.
- **Implied topic parents.** The taxonomy lists `ai-tooling/agents` without `ai-tooling`; the topic tree adds an implied parent so every topic has a group page.
- **Narrow-screen collapsing without JavaScript.** Summary, Arguments, Your notes and History are `<details>` under a real `h2`. On wide screens, CSS overrides `::details-content` to show them open; browsers without that selector keep them collapsible.
- **Unknown values.** View-model enums are typed as the known values plus any string. Signals render an unknown value as text ("Confidence: very-high"), and the support rollup treats an unknown level as weakest so it is never hidden.
- **Visually hidden text is anchored to its containing block's corner.** At the end of a wrapped line, its static position could widen the page at 320px.
- **Reserved V2 routes** (`/e/[id]/trace`, `/me`, `/digest/[week]`) are not created, so they 404.
- **Not yet verified:** Lighthouse mobile on Entry, a colour-blind simulation screenshot, and manual keyboard and VoiceOver passes. These need a real device or a person.

## Performance (2026-11-20)

Measurements and the before/after numbers are in [performance.md](performance.md).

- **Faster navigation comes from speculation, not a client router.** Owner pages send a `Speculation-Rules` response header pointing at `/speculation-rules.json`, which prerenders (and, as a fallback, prefetches) a same-origin page when the pointer rests on its link for about 200 ms or on pointerdown. It is a header and a JSON file rather than an inline `<script type="speculationrules">`, so the nonce CSP and the `dangerouslySetInnerHTML` ban stay as they are. API routes (sign-out, theme, last visit) and `/signin` are never speculated. Speculative requests carry `Sec-Purpose: prefetch`, not the `Purpose`/`Next-Router-Prefetch` headers that `proxy.ts` skips, so they get the owner-session check and a fresh nonce like any page load. Chromium only; other browsers navigate as before.
- **Next.js `<Link>` is not adopted.** Client-side navigation would keep the layout mounted, so the footer's `return_to` (read from the request path) would go stale; it changes focus and announcement behaviour that the e2e and manual accessibility passes cover for full page loads; and its prefetches skip `proxy.ts`, so they would bypass the session gate there (pages still check). Speculation rules give the same "already loaded" effect with plain `<a>` and no JavaScript.
- **Cross-document view transitions.** `@view-transition { navigation: auto }` in `base.css` keeps the current page on screen and cross-fades to the next instead of flashing blank. CSS only, and off under `prefers-reduced-motion`.
- **A fourth client component: `NavigationPending`.** A full page load gives no in-page feedback until the next page arrives. This component listens for a same-origin link click or a form submit and, after 150 ms (so prerendered and cached pages never flash it), shows a 3 px bar fixed to the top of the viewport and says "Loading page" in a polite `role="status"` region. The bar is out of flow, so it cannot shift layout (e2e measures CLS = 0 while it shows); it is static under reduced motion; without JavaScript the browser's own indicator is the feedback. A pure-CSS version is not possible: nothing in CSS knows a cross-document navigation is pending. Added to the allow-list in `scripts/check-use-client.mjs`.
- **Still no `loading.tsx`, Suspense streaming or skeletons.** Streamed boundaries are revealed by an inline script, so without JavaScript the streamed content stays hidden: it would fail "every page works with JavaScript disabled". Measured warm renders are 10–75 ms, so streaming would only help a cold cache, which speculation already hides. The spec's "no skeleton shimmer" stands; no spec revision is proposed.
- **No `cacheComponents` / `"use cache"`.** Every page is dynamic anyway (session cookie, per-request nonce), and the data cache already serves warm reads in ~0 ms. The remaining warm cost is rendering, not derived data. Pages instead share one entry-list parse and one topics parse per request: data functions take optional `entries`/`topics` promises. React `cache()` would do the same, but `src/data` must not import React.
- **No waterfalls on a cold cache.** Topic pages start the topics, entries and observations requests together. Entry pages start the Baseline feature lookup from the (usually cached) entry list's feature ids alongside the entry request, and fall back to the entry's own ids if they differ.
- **TTLs unchanged (300 s, 60 s).** Next's time-based revalidation is stale-while-revalidate: an expired read is served stale while it refreshes in the background, so a longer TTL would not make pages faster, only staler. Blocking reads happen only when the cache is empty or a tag is expired through `/api/revalidate`. Once the data repo's sync calls the webhook, longer TTLs become safe and reduce data-API load.
- **API timing logs.** `API_TIMING=1` logs one JSON line per data-API call (`{"evt":"api","path":"entries","status":200,"ms":412}`); calls over 2 s are always logged. Server-Timing headers are not possible from Server Components, so logs are the measurement in production.
