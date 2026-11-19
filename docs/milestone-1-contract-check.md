# Milestone 1: contract check

Checked 2026-11-19 against `futurethang/whetstone` at `303f7f1`. Nothing in the data repo has been changed.

## Summary

- **6 of the 15 endpoints exist in some form.** None match the spec's shape exactly. **9 are missing.**
- **Every missing endpoint can be built over existing tables.** No schema change is needed for any V1 feature.
- **The API is at `/api/v1/…`, not `/v1/…`.** It is served by the same Next.js app (`apps/web`) as the old UI.
- **A read-scope bearer token already exists** (`WHETSTONE_READ_TOKEN`). Auth, rate limiting (120 reads per minute per token) and auditing sit in `withApi()`.
- **The error shape differs from the spec.** The API returns `{ error: "message" }`, or `{ error, issues[] }` on a 400. The spec expects `{ error: { code, message } }`.
- **Every response sends `cache-control: no-store`.** That is fine, because the web app does its own caching with tags.

### Things the spec should change

1. **Base path.** Use `/api/v1/` (`WHETSTONE_API_URL=https://<data-app>/api`) rather than adding a second `/v1/` prefix.
2. **Retiring the old UI.** "Delete it from the data repo in one change" must keep `apps/web/app/api/**`, `lib/auth.ts`, `lib/queries.ts` and `lib/db.ts`, because the API and MCP live in the same app. Only the pages, `proxy.ts` (the UI's Supabase session and CSP gate), `login`, `auth/*`, `health/page.tsx` and `lib/ui.tsx` go.
3. **Last-visit granularity.** `entry_history.date` is a `date`, not a timestamp. `/changes?since=` accepts `YYYY-MM-DD` only. "Since last visit" therefore works at day level. Events on the day of the last visit would either reappear or be hidden. Suggestion: compare with `>=` on the cookie's date and accept repeats on that one day.
4. **"Your notes" is "Owner notes".** The body heading is `## Owner notes`, and below it the comment `<!-- Whetstone never edits below this line. -->`. The section order should read Summary, Arguments, Evidence, Owner notes.
5. **The "Reviewed" event does not exist.** History events seen in code and data are `created`, `updated`, `status_change` (`from`, `to`, `note`), `owner_note` and `revet_proposed`, plus `epoch` rows. `last_reviewed` is a frontmatter date that changes on revet. Map `revet_proposed` to the label "Re-vetted" and keep the `unknown` fallback.
6. **`slug` does not exist.** The entry `id` is already slug-shaped (`container-queries-for-component-layout`). Use `/e/[id]`.
7. **Epoch dates are synthetic.** Sync stores epochs as `date = <year>-01-01` with `data = { period, summary }`. Render `period` (for example "2026-Q1"), not the date.
8. **Search limits.** REST caps `limit` at 10, and the SQL function caps it at 50. The response drops `score`, and there is no snippet or match type. The intersect-with-filters strategy needs a higher cap and the score (see the Search row in *Endpoint by endpoint*).

## Endpoint by endpoint

| Spec endpoint | Status | What exists / what to build |
| --- | --- | --- |
| `/v1/entries` | **Missing** (partial) | `export.json` returns all entries through `allEntries()`, but it streams and includes the registry, and it lacks `related`, `superseded_by`, `first_seen` and `updated_at`. Build `GET /api/v1/entries` from `entries` plus a `max(entry_history.date)` per entry for `updated_at`. Do **not** use `entries.updated_at`: it is the sync time, which is rewritten on every mirror sync. |
| `/v1/entries/:id` | **Exists, needs fields** | `GET /api/v1/entries/:id?include_history=true` returns summary fields, `body_md`, `sources` (from frontmatter: `url`, `title`, `tier`, `retrieved`), `related`, `supersedes`, `superseded_by`, `first_seen` and `history[]` with `is_epoch`. Add `features` (only `support[]` is returned, with feature id, baseline and dates) and `epochs` as a separate array, or let the web app split on `is_epoch`. |
| `/v1/topics` | **Exists, different shape** | Returns `id`, entry counts, `by_status` and `stale`. Add `review_interval` (stored as a Postgres interval, for example `1 year`). `parent` is not stored: derive it from the id (`css/layout` → `css`). There are no labels (see open questions). |
| `/v1/search` | **Exists, needs changes** | `q`, `topics`, `status`, `limit` (1–10). Hybrid ranking with reciprocal rank fusion (RRF) is in `search_entries()`. Raise `limit` to 50 and return `score`. There is no snippet or match type: the spec already treats both as "if available", so leave them out for V1. Each search computes an embedding, which costs one embed call per query. |
| `/v1/changes` | **Exists, different shape** | `since=YYYY-MM-DD` (default 30 days), at most 200 events, epochs excluded. Returns `changes[]` (`entry_id`, `date`, `event`, `note`, `from`, `to`) plus full entry results for those entries. That matches the spec. The 200 cap needs pagination (or `until=`) for Changes' "Older" link. |
| `/v1/features?ids=` | **Missing** | Only `GET /api/v1/features/:id` exists, which also returns every citing entry and fuzzy-matches names. Build a batch lookup on `feature_status` (`feature_id`, `name`, `baseline`, `baseline_low_date`, `baseline_high_date`, `spec_urls`). |
| `/v1/features/:id` | **Exists** | Returns the feature, full entry results that cite it, and `other_matches`. Usable as is: take entry ids from `entries[]`. |
| `/v1/observations?topic=&limit=` | **Missing** | Table `observations`: `id`, `topic`, `entry_id`, `claim`, `stance` (supports, opposes, informational), `kind` (claim, support_change, deprecation, release), `strength`, `first_seen`, `last_seen` and `status` (open, consumed, expired). There is no "created" column: use `first_seen`. Decide whether to filter on `status = 'open'`. |
| `/v1/observations/:id` | **Missing** | Join `observation_citations` (`url`, `raw_item_id`, `source_id`, `author_id`, `tier`, `published_at`). |
| `/v1/items/:id` | **Missing** | `raw_items`: `source_id`, `author_id` (the author **name** needs a join to `authors`), `title`, `url`, `published_at`, `relevance` and `state`. "Observations extracted from it" means a reverse join through `observation_citations.raw_item_id`. Retention nulls `content_text` after 60 days and deletes rows after 365 days, so old links will return 404. |
| `/v1/deltas?outcome=pending` | **Missing** | `deltas`: `id`, `kind`, `entry_id`, `path`, `proposed_status`, `rationale`, `score`, `observation_ids`, `pr_number` and `outcome`. Do not return `proposed_content` (large, and not needed for V1). |
| `/v1/sources` | **Missing** (partial) | `healthStats()` reads `sources` for the old health page but has no route. Join the `track_record` view (`kind='source'`: `accepted`, `rejected`, `acceptance_rate`, plus 180-day figures). Leave out `config` and `cursor`. |
| `/v1/sources/:id` | **Missing** | One source plus `raw_items where source_id = :id order by fetched_at desc limit N`. |
| `/v1/runs?limit=` | **Missing** (partial) | `runs`: `id`, `job`, `status` (running, succeeded, partial, failed, skipped), `started_at`, `finished_at`, `est_cost_usd`, `stats`, `error` and token counts. `healthStats()` already queries it. |
| `/v1/budget` | **Missing** (partial) | Month-to-date spend = sum of `runs.est_cost_usd` since the 1st of the month (UTC), as `healthStats()` computes it. The cap is `budgets.monthly_usd_cap: 15` in `whetstone.config.yaml`, not in the database. The route reads the config. |

### Work for the data repo (proposed, not started)

- **New routes:** 9, each a thin `withApi("read", …)` wrapper plus a query in `lib/queries.ts`. They follow the existing pattern.
- **Changes to existing routes:** 4 (entries/:id, topics, search, changes).
- **Error shape:** change `jsonError()` and `badRequest()` to `{ error: { code, message } }`. **This is a breaking change for current consumers** (MCP is unaffected, REST snippets in `docs/consumer-snippet.md` are affected). Alternatives: make the web app's `client.ts` accept both shapes, or add `code` alongside the string. Recommend: the web app accepts the current shape, and the API stays as it is.
- **Rate limit:** 120 reads per minute per token. A cold Search render makes about 3 calls, and a revalidation burst could hit the limit. Either give the web app its own token with a higher limit or rely on the tag cache. No change is needed to start.
- **Revalidation hook:** the data repo has no webhook today. Calling `POST /api/revalidate` from `.github/workflows/sync.yml` after a sync is a one-step addition.

## Answers to the spec's open questions

**1. Which of the 15 endpoints exist, and in what shape?** See the table above. Six exist in part, and nine are missing.

**2. Does the pipeline write Evidence lines in a consistent format?** Yes. Both writers (`packages/core/src/entry.ts:89` and `packages/pipeline/src/jobs/distill.ts:160`) emit:

```
- <YYYY-MM-DD> · <normative|expert|community> · <source name> · <claim> · [link](<url>)
```

The date is the item's publish date, not the retrieval date. The tier is lowercase. Parse from both ends: date and tier first, `[link](…)` last, source name next. The claim is everything between the source name and the link, because a claim may itself contain ` · `. Owner-written evidence may not follow the format, which is why the spec's fallback is needed. Three real lines are in [`tests/fixtures/evidence-lines.md`](../tests/fixtures/evidence-lines.md), along with two malformed ones.

**3. Does the topic taxonomy carry labels, or only ids?** Only ids. `knowledge/taxonomy.yaml` and the `topics` table hold `id`, `review_interval` and `half_life_days`. The hierarchy is implicit in the `/` in the id, and there is no parent column. The spec's fallback (title-cased last segment) applies everywhere. A small label map in the web repo (`css/color-and-typography` → "Color and typography", `web-apis` → "Web APIs") is presentation, not data, so it fits V1.

**4. Do deltas store the PR number or URL?** The number: `deltas.pr_number int`. The URL is `https://github.com/${GITHUB_REPO}/pull/${pr_number}`. The API should return `pr_url` built from its own `GITHUB_REPO`, so the web app does not need to know the repo.

## Fields the spec assumes that do not exist

| Spec field | Reality | Effect |
| --- | --- | --- |
| entry `slug` | Use `id` | Route is `/e/[id]` |
| entry `updated_at` (latest history date) | Derive it from `entry_history` in the new endpoint | None, if built as above |
| topic `label`, `parent` | Not stored | Derive in the web repo |
| observation "created date" | `first_seen` | Rename only |
| history kind "Reviewed" | Not emitted | Drop it; add "Re-vetted" (`revet_proposed`) |
| changes `since` as an ISO timestamp | Date only | Day-level last visit (see item 3 in *Things the spec should change*) |
| search `snippet`, `match type` | Not available | Show verdict instead; no match tag (already optional in the spec) |
| epoch date | Synthetic `YYYY-01-01` | Show `period` |
| item `author` | `author_id` only | Join `authors.name` in the endpoint |

No V1 feature has to be dropped.
