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
