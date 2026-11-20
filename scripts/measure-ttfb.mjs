#!/usr/bin/env node
/**
 * Cold and warm TTFB per route against a running production build (`pnpm build && pnpm start`) that reads the
 * mock data API (tests/e2e/mock-api.mjs). Start the mock with MOCK_API_LATENCY_MS (and MOCK_API_SEARCH_LATENCY_MS)
 * to model the deployed data API. "Cold" expires every cache tag first via /api/revalidate; "warm" is the median
 * of the next three loads. API calls are counted by the mock's /stats endpoint. EXPIRE_TAGS=a,b expires only
 * those tags (e.g. "entry:<id>,features" for an entry not yet cached while the entry list is warm).
 *
 *   node scripts/measure-ttfb.mjs [baseUrl] [mockUrl]
 */
import { SignJWT } from "jose";

const BASE = process.argv[2] ?? "http://localhost:3100";
const MOCK = process.argv[3] ?? "http://127.0.0.1:4010";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "e2e-auth-secret-0123456789-abcdefghijklmnop";
const OWNER = process.env.OWNER_GITHUB_ID ?? "17099707";
const REVALIDATE = process.env.REVALIDATE_SECRET ?? "e2e-revalidate-secret-0123456789";
const ROUTES = process.env.ROUTES?.split(",") ?? [
  "/", "/t/css", "/e/container-queries-for-component-layout", "/search", "/search?q=container", "/changes",
  "/f/container-queries", "/pipeline", "/pipeline/sources/smashing", "/digest", "/o/101", "/i/9001",
];

// Same claims as signSession in src/auth/session.ts.
const session = await new SignJWT({ login: "owner" }).setProtectedHeader({ alg: "HS256" }).setSubject(OWNER).setIssuer("whetstone-web").setAudience("whetstone-web").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(AUTH_SECRET));
const cookie = `ws_session=${session}`;

async function ttfb(path) {
  const t = performance.now();
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  const first = performance.now() - t;
  await res.arrayBuffer();
  if (res.status !== 200) throw new Error(`${path}: HTTP ${res.status}`);
  return { ttfb: Math.round(first), total: Math.round(performance.now() - t) };
}

async function expireAll() {
  const res = await fetch(`${BASE}/api/revalidate`, {
    method: "POST",
    headers: { authorization: `Bearer ${REVALIDATE}`, "content-type": "application/json" },
    body: JSON.stringify({ tags: process.env.EXPIRE_TAGS?.split(",") ?? ["entries", "topics", "features", "pipeline", "digest"] }),
  });
  if (!res.ok) throw new Error(`revalidate: HTTP ${res.status}`);
}

const stats = async (reset) => (await fetch(`${MOCK}/stats${reset ? "?reset=1" : ""}`)).json();
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

await ttfb("/"); // compile and warm the server process
const rows = [];
for (const path of ROUTES) {
  await expireAll();
  await stats(true);
  const cold = await ttfb(path);
  const calls = Object.values(await stats(true)).reduce((a, b) => a + b, 0);
  const warm = [];
  for (let i = 0; i < 3; i++) warm.push((await ttfb(path)).ttfb);
  const warmCalls = Object.values(await stats(true)).reduce((a, b) => a + b, 0);
  rows.push({ path, coldTtfb: cold.ttfb, coldTotal: cold.total, warmTtfb: median(warm), apiCallsCold: calls, apiCallsWarm3: warmCalls });
}
console.table(rows);
console.log(JSON.stringify(rows));
