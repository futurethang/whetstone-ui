# whetstone-web

The owner interface for [Whetstone](https://github.com/futurethang/whetstone). It is server-rendered, read-only and owner-only. It reads everything through the data layer's HTTP API (`/api/v1`) and never touches Postgres, git or the pipeline.

Status: **milestone 2 (skeleton)** of the V1 UI spec. Sign-in, layout, theme, security headers, the data client and CI are in place. The home page is a placeholder that proves the connection to the API. Entry, Browse, Search and the secondary pages follow in milestones 3–6.

## Run locally

Requires Node 22 and pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local   # fill in the values below
pnpm dev
```

The GitHub OAuth app only accepts its registered callback URL. For local sign-in, create a second OAuth app with `http://localhost:3000/api/auth/callback/github`.

## Environment variables

Set these in the Vercel project (Production; mark secrets **Sensitive**). All are server-only.

| Variable | What it is | Where it comes from |
| --- | --- | --- |
| `WHETSTONE_API_URL` | Data API base, without `/v1` | Data app's production domain + `/api`, e.g. `https://<data-app>.vercel.app/api` |
| `WHETSTONE_API_TOKEN` | Read-scope bearer token | The data app's `WHETSTONE_WEB_TOKEN` (same value) |
| `AUTH_SECRET` | Signs the session cookie (≥ 32 chars) | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | GitHub OAuth app | github.com/settings/developers; callback `https://<web-app>/api/auth/callback/github` |
| `OWNER_GITHUB_ID` | The only GitHub account allowed in (numeric id) | `id` field of `https://api.github.com/users/<username>` |
| `REVALIDATE_SECRET` | Bearer secret for `POST /api/revalidate` | `openssl rand -base64 32` |

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm lint` | ESLint, including the data-boundary and no-inline-style rules |
| `pnpm check:client` | Fails if a `"use client"` file is not on the allow-list |
| `pnpm test` | Vitest: data client, session, redirects, routes, token contrast |
| `pnpm test:e2e` | Playwright against a production build and a mock data API: auth, CSP, headers, no-JS, axe in both themes |

## Architecture rules

- **One door to the data:** only `src/data/client.ts` calls `fetch` for the API (ESLint enforces it). It adds the bearer token, cache tags and TTLs, validates every response with zod, and turns failures into an `ApiError` that names the data source.
- **View models, not API shapes:** pages import functions from `src/data/<resource>.ts` and types from `src/data/models.ts`. Domain facts (stale, support level, facets) are computed in `src/data/adapters/`.
- **`src/data` has no React or Next.js imports**, so another presentation can reuse it.
- **Server-rendered, no JavaScript needed:** every control is a link or a form. Only allow-listed client components exist (`scripts/check-use-client.mjs`).
- **CSP:** `proxy.ts` sets a per-request nonce policy. No inline `style` attributes (ESLint enforces it).
- **Colours live only in `src/styles/tokens.css`.** A unit test checks every text pairing at 4.5:1 in both themes.

## Auth

`proxy.ts` sends any request without a valid owner session to `/signin`, and owner pages check again in `app/(app)/layout.tsx`. Sign-in is GitHub OAuth (`arctic`) with no scopes. The callback admits only `OWNER_GITHUB_ID` and sets a signed, HttpOnly session cookie (`jose`, HS256, 30 days). There is no auth database.

## Cache refresh

API reads are cached with tags (`topics`, `entries`, `entry:<id>`, `features`, `pipeline`, `digest`): 300 s by default, 60 s for pipeline and digest. The data layer can expire tags immediately:

```bash
curl -X POST https://<web-app>/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" -H "content-type: application/json" \
  -d '{"tags":["entries","topics"]}'
```

See [docs/decisions.md](docs/decisions.md) for where this repo departs from the V1 spec, and why.
