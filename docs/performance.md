# Performance report (2026-11-20)

Goal: navigation that feels fast, without giving up the V1 baseline (works without JavaScript, CLS < 0.05, no skeleton shimmer, allow-listed client components, strict nonce CSP).

## How it was measured

- **Data API in production** (`https://whetstone-three-rho.vercel.app/api/v1`): `curl -w` timings from a cloud container, unauthenticated (no read token was available), so every call is a 401. That still measures the network, TLS and a function invocation up to the auth check, but not the Supabase queries, rate-limit RPC or audit insert behind it.
- **Web app pages in production**: not measured. They need an owner session (GitHub OAuth). To measure there, set `API_TIMING=1` on the Vercel project and read the runtime logs (one JSON line per data-API call), and enable Speed Insights for field LCP/INP.
- **Web app locally**: production build (`pnpm build && pnpm start`) against the mock API (`tests/e2e/mock-api.mjs`) with latency modelled on the production numbers: `MOCK_API_LATENCY_MS=350`, `MOCK_API_SEARCH_LATENCY_MS=500` (embedding call), and `MOCK_API_ENTRY_COPIES=83` (~500 entries, 370 KB `/entries` body). `node scripts/measure-ttfb.mjs` reports cold TTFB (all cache tags expired via `/api/revalidate`), warm TTFB (median of three) and data-API calls per page. Afterwards, delete `.next/cache` before running e2e tests: the data cache survives rebuilds and would still hold the ~500 copied entries.

## 1. Data API, production (unauthenticated)

| Request | TTFB after TLS (18 samples) | Notes |
| --- | --- | --- |
| Static 404 from the edge (`/favicon.ico`, `x-vercel-cache: HIT`) | ~45 ms | Network round trip to Vercel's edge |
| `/api/v1/{topics,entries,budget}` → 401 | median ~370 ms, range 166–576 ms | Function in `iad1`; `cache-control: no-store`, `x-vercel-cache: MISS` |

So **~320 ms is spent inside the data API function just to reject a request**, before any data query. An authenticated read adds the rate-limit RPC, the query and the audit insert (several more Supabase round trips) on top. The 350 ms model below is therefore conservative for real reads.

## 2. Web app, before (local production build, modelled latency, ~500 entries)

Mean of two runs. "Calls" counts data-API requests on a cold load; warm loads made none (all served by Next's data cache).

| Route | Cold TTFB | Warm TTFB | Calls (cold) | Why cold is slow |
| --- | --- | --- | --- | --- |
| `/` | 428 ms | 34 ms | 7 | 7 parallel calls: one round trip |
| `/t/css` | **810 ms** | 83 ms | 3 | Waterfall: topics, then entries + observations |
| `/e/<id>` | **748 ms** | 30 ms | 4 | Waterfall: entry, then its Baseline features |
| `/search` | 393 ms | 28 ms | 2 | |
| `/search?q=container` | **868 ms** | 17 ms | 3 | Search waits on the embedding call |
| `/changes` | 385 ms | 19 ms | 3 | |
| `/f/<id>`, `/pipeline`, `/pipeline/sources/<id>`, `/digest`, `/o/<id>`, `/i/<id>` | 367–373 ms | 9–14 ms | 1–3 | |

Findings:

1. **With a warm cache the server is not the problem**: 9–83 ms per page at ~500 entries. Topic is the slowest because it renders the most rows.
2. **A cold cache costs one data-API round trip per level of dependency.** Two pages had a second, serial level.
3. **Cold reads are rarer than they look.** Time-based revalidation is stale-while-revalidate, so an expired entry is served stale while it refreshes. Reads block only when the cache is empty (new deployment, first visit to an entry) or after `/api/revalidate` expires a tag.
4. **The felt slowness is mostly the navigation itself**: every click is a full document load that starts only on click, with no feedback until the next page paints (a blank flash), plus the data API's ~350 ms+ per cold call.

## 3. What changed

| Change | Effect | Constraint check |
| --- | --- | --- |
| Speculation Rules via a `Speculation-Rules` header and `/speculation-rules.json` (prerender, with prefetch as fallback, `moderate` eagerness) | The page is fetched while the pointer rests on its link, so the click shows it at once | No inline script, so no nonce or CSP change; speculative requests pass through `proxy.ts` (session check and nonce); API routes and `/signin` excluded |
| Cross-document view transitions (`@view-transition`) | Cross-fade instead of a blank flash; header stays put | CSS only; off under reduced motion |
| `NavigationPending` client component | 3 px top bar and a polite "Loading page" status after 150 ms of a pending navigation | Fixed position, so CLS is 0; static under reduced motion; no-JS falls back to the browser's indicator; allow-listed with a recorded decision |
| No waterfall on Topic | Topics, entries and observations requested together | |
| Early Baseline lookup on Entry | Feature details start from the cached entry list's ids alongside the entry request | Falls back to the entry's own ids if they differ |
| One entry-list and topics parse per request | Home parsed and mapped the full entry list 3 times and topics 4 times; now once each | `src/data` stays free of React (promises passed explicitly) |
| `API_TIMING=1` timing logs in `src/data/client.ts` | One JSON line per data-API call; calls over 2 s always logged | Still the only module that calls `fetch` |

Not adopted, with reasons in [decisions.md](decisions.md#performance-2026-11-20): Next.js `<Link>`, Suspense streaming and skeletons, `cacheComponents`/`"use cache"`, longer TTLs.

## 4. After

### Server TTFB (same setup, mean of two runs)

| Route | Cold before | Cold after | Warm before | Warm after |
| --- | --- | --- | --- | --- |
| `/` | 428 ms | 392 ms | 34 ms | 22 ms |
| `/t/css` | **810 ms** | **451 ms** | 83 ms | 74 ms |
| `/e/<id>`, everything cold | 748 ms | 756 ms | 30 ms | 37 ms |
| `/e/<id>`, entry not cached, entry list warm (the usual case) | **794 ms** | **388 ms** | | |
| `/search?q=container` | 868 ms | 866 ms | 17 ms | 18 ms |
| Other routes | 367–385 ms | 364–385 ms | 8–28 ms | 9–37 ms |

Warm differences of a few milliseconds are within run-to-run noise. Entry with everything cold is unchanged: the feature lookup needs ids from either the entry or the entry list, and both are cold. Removing it needs the data API to include feature details in `/entries/<id>` (follow-up below).

### Click to next page (Chromium, cold cache, 350 ms API model, 12 navigations each)

| | Median | p90 |
| --- | --- | --- |
| Click (as before: no speculation) | 469 ms | 578 ms |
| Pointer rests on the link ~600 ms, then click | **56 ms** | 195 ms |
| Warm cache, click | 91 ms | 253 ms |
| Warm cache, hover then click | 55 ms | 185 ms |

These hover numbers use the **prefetch** fallback: Chrome refuses to prerender while DevTools automation is attached (`PrerenderingDisabledByDevTools`), so prerender could not be measured here. In a normal Chrome session the prerendered page is already rendered and activates almost instantly. With `moderate` eagerness, touch users get a head start only from pointerdown and keyboard users none, so for them the pending indicator does most of the work.

## 5. Verification

`pnpm typecheck`, `lint`, `check:client`, `test` (134) and `test:e2e` (103, including 7 new) pass. The new e2e tests cover: the pending bar appears on a slow navigation, is `role="status"` with "Loading page", is fixed at the top and causes zero layout shift; it is static under reduced motion; it ignores in-page, new-tab and other-origin links; nothing is pending or hidden without JavaScript; owner pages (not `/signin`) send the rules header; the rules exclude `/api/*` and `/signin`; hovering a link fetches the page ahead with the session and a nonce CSP and no CSP violations. The existing tests still run axe in both themes, check CSP and no-JS on every route, and check 320 px.

## 6. Proposed follow-ups in the data API (futurethang/whetstone, `apps/web`)

In rough order of payoff:

1. **Wire the sync workflow to `POST /api/revalidate`** with the tags it changed (`entries`, `entry:<id>`, `topics`, `digest`, `pipeline`). Then the web app's TTLs can be raised (for example 3600 s) without serving stale content, cutting cold reads and API load. Small PR in the data repo.
2. **Move the audit insert and rate-limit RPC off the response path** (Vercel `waitUntil`), or skip both for the web app's server-to-server token, which is already behind the owner session and Next's data cache. That removes several Supabase round trips from every read.
3. **Find why a 401 takes ~320 ms server-side.** A rejected token should cost a few milliseconds; this suggests a cold start, or Supabase work before the auth check.
4. **Co-locate regions.** The data API function runs in `iad1`. Check the Supabase project region and pin both Vercel projects (`regions` in `vercel.json`, or the project's Function Region) to the region nearest the database.
5. **Include Baseline feature details in `GET /entries/<id>`** (name, description, dates, spec URLs). Removes the last cold-cache waterfall (Entry, ~350 ms).
6. **HTTP caching for read endpoints**: `ETag` with `304 Not Modified`, or a response cache in the data API keyed by path and query and invalidated on sync. Next's data cache does not send conditional requests, so the bigger win is a server-side response cache (data changes only when the pipeline syncs).
7. **A combined `/home` endpoint**: lower priority. Home's 7 calls already run in parallel (one round trip), so this mostly reduces API load and tail latency.
