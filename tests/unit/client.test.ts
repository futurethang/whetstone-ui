import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiGet, apiGetOrNull, buildUrl } from "@/data/client";

const Schema = z.object({ schema: z.literal(1), items: z.array(z.object({ id: z.string() })) });
const opts = { source: "things", path: "things", schema: Schema, tags: ["entries" as const] };

function respond(status: number, body: unknown, raw = false) {
  return vi.fn(async () => new Response(raw ? (body as string) : JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

beforeEach(() => {
  process.env.WHETSTONE_API_URL = "https://data.test/api/";
  process.env.WHETSTONE_API_TOKEN = "tok";
});
afterEach(() => vi.unstubAllGlobals());

describe("buildUrl", () => {
  it("joins base, version and path, and skips empty params", () => {
    expect(buildUrl("https://d.test/api", "/search", { q: "has()", limit: 50, topics: ["css", "html"], x: undefined, y: "" })).toBe(
      "https://d.test/api/v1/search?q=has%28%29&limit=50&topics=css%2Chtml",
    );
  });
});

describe("apiGet", () => {
  it("sends the bearer token, tags and revalidate, and returns parsed data", async () => {
    const f = respond(200, { schema: 1, items: [{ id: "a", extra: true }], unknown_field: 1 });
    vi.stubGlobal("fetch", f);
    const out = await apiGet(opts);
    expect(out).toEqual({ schema: 1, items: [{ id: "a" }] });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit & { next: { tags: string[]; revalidate: number } }];
    expect(url).toBe("https://data.test/api/v1/things");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer tok");
    expect(init.next).toEqual({ revalidate: 300, tags: ["entries"] });
  });

  it("fails loudly in one place when the contract drifts", async () => {
    vi.stubGlobal("fetch", respond(200, { schema: 1, items: [{ id: 5 }] }));
    await expect(apiGet(opts)).rejects.toMatchObject({ name: "ApiError", source: "things", message: expect.stringContaining("items.0.id") });
  });

  it.each([
    [{ error: "unauthorized" }, "unauthorized"],
    [{ error: { code: "rate_limited", message: "too many requests" } }, "too many requests"],
    [{ nope: 1 }, "HTTP 500"],
  ])("reads both error shapes: %j", async (body, msg) => {
    vi.stubGlobal("fetch", respond(500, body));
    const e = await apiGet(opts).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(500);
    expect(e.message).toContain(msg);
  });

  it("reports an unreachable API without leaking internals", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed: ECONNREFUSED 10.0.0.1:443"); }));
    const e = await apiGet(opts).catch((x) => x);
    expect(e).toMatchObject({ source: "things", status: null });
    expect(e.message).not.toContain("10.0.0.1");
  });

  it.each([
    [undefined, "WHETSTONE_API_URL is not set"],
    ["whetstone.vercel.app/api", "not a full URL"],
    ["ftp://data.test/api", "must start with https://"],
  ])("turns a bad WHETSTONE_API_URL (%s) into a notice, not a crash", async (value, msg) => {
    if (value === undefined) delete process.env.WHETSTONE_API_URL;
    else process.env.WHETSTONE_API_URL = value;
    const f = respond(200, {});
    vi.stubGlobal("fetch", f);
    const e = await apiGet(opts).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.message).toContain("misconfigured");
    expect(e.message).toContain(msg);
    expect(f).not.toHaveBeenCalled();
  });

  it("reports a missing token as a settings problem without calling the API", async () => {
    delete process.env.WHETSTONE_API_TOKEN;
    vi.stubGlobal("fetch", respond(200, {}));
    await expect(apiGet(opts)).rejects.toMatchObject({ message: expect.stringContaining("WHETSTONE_API_TOKEN is not set") });
  });

  it.each(["https://data.test/api/v1", "https://data.test/api/v1/", "https://data.test/api//"])("accepts %s as the API root", async (value) => {
    process.env.WHETSTONE_API_URL = value;
    const f = respond(200, { schema: 1, items: [] });
    vi.stubGlobal("fetch", f);
    await apiGet(opts);
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("https://data.test/api/v1/things");
  });

  it("rejects non-JSON bodies", async () => {
    vi.stubGlobal("fetch", respond(502, "<html>Bad gateway</html>", true));
    await expect(apiGet(opts)).rejects.toMatchObject({ status: 502, message: expect.stringContaining("non-JSON") });
  });

  it("apiGetOrNull maps 404 to null; apiGet throws", async () => {
    vi.stubGlobal("fetch", respond(404, { error: "not found" }));
    await expect(apiGetOrNull(opts)).resolves.toBeNull();
    await expect(apiGet(opts)).rejects.toMatchObject({ status: 404 });
  });
});
