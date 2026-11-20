/**
 * The ONLY module that calls the Whetstone data API (enforced by ESLint).
 * Adds the bearer token, cache tags and revalidation, validates every response with zod,
 * and turns any failure into an ApiError that names the data source.
 */
import "server-only";
import type { z } from "zod";
import { ConfigError, env } from "@/env";

export const REVALIDATE_DEFAULT = 300;
export const REVALIDATE_FAST = 60; // pipeline and digest

export type CacheTag = "entries" | "topics" | "features" | "pipeline" | "digest" | `entry:${string}`;
export type Query = Record<string, string | number | boolean | readonly string[] | undefined | null>;

export class ApiError extends Error {
  override name = "ApiError";
  constructor(
    /** Human name of the data source, shown to the owner: "topics", "entry container-queries". */
    readonly source: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
  }
}

export function buildUrl(base: string, path: string, query: Query = {}): string {
  const u = new URL(`${base}/v1/${path.replace(/^\/+/, "")}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    u.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  return u.toString();
}

/** The API returns { error: "message" } today; { error: { code, message } } is accepted too. */
function errorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const e = (body as { error: unknown }).error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return null;
}

type GetOptions<S extends z.ZodType> = {
  source: string;
  path: string;
  query?: Query;
  schema: S;
  tags: CacheTag[];
  revalidate?: number;
};

async function request<S extends z.ZodType>(o: GetOptions<S>, allow404: boolean): Promise<z.infer<S> | null> {
  let url: string, token: string;
  try {
    url = buildUrl(env.apiUrl(), o.path, o.query);
    token = env.apiToken();
  } catch (e) {
    // Settings problems become a readable notice instead of a crash. Messages name variables, never values.
    throw new ApiError(o.source, null, `The web app is misconfigured: ${e instanceof ConfigError ? e.message : "the data API settings are invalid"}.`);
  }
  let res: Response;
  const started = performance.now();
  try {
    res = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      next: { revalidate: o.revalidate ?? REVALIDATE_DEFAULT, tags: o.tags },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    logTiming(o.path, null, started);
    throw new ApiError(o.source, null, `The data API could not be reached (${e instanceof Error ? e.name : "network error"}).`);
  }
  logTiming(o.path, res.status, started);
  if (res.status === 404 && allow404) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(o.source, res.status, `The data API returned a non-JSON response (HTTP ${res.status}).`);
  }
  if (!res.ok) throw new ApiError(o.source, res.status, errorMessage(body) ?? `The data API returned HTTP ${res.status}.`);
  const parsed = o.schema.safeParse(body);
  if (!parsed.success) {
    const where = parsed.error.issues.slice(0, 3).map((i) => i.path.join(".") || "(root)").join(", ");
    throw new ApiError(o.source, res.status, `The data API response did not match the expected shape at ${where}.`);
  }
  return parsed.data;
}

/**
 * One JSON line per API call when API_TIMING=1 (Vercel runtime logs, or the terminal locally): the path without
 * its query, the status and the time to response headers. A call served from Next's data cache takes ~0 ms.
 * Calls slower than 2 s are always logged, so a slow data API shows up in production without the flag.
 */
function logTiming(path: string, status: number | null, started: number) {
  const ms = Math.round(performance.now() - started);
  if (process.env.API_TIMING !== "1" && ms < 2000) return;
  console.info(JSON.stringify({ evt: "api", path: path.split("?")[0], status, ms }));
}

export async function apiGet<S extends z.ZodType>(o: GetOptions<S>): Promise<z.infer<S>> {
  return (await request(o, false)) as z.infer<S>;
}

/** Like apiGet, but a 404 resolves to null so pages can call notFound(). */
export function apiGetOrNull<S extends z.ZodType>(o: GetOptions<S>): Promise<z.infer<S> | null> {
  return request(o, true);
}
