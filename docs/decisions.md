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
