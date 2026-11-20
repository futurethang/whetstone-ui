import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

const { POST: revalidate } = await import("../../app/api/revalidate/route");
const { POST: theme } = await import("../../app/api/theme/route");

beforeEach(() => {
  process.env.REVALIDATE_SECRET = "r".repeat(40);
  revalidateTag.mockClear();
});

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://web.test/api/revalidate", { method: "POST", body, headers: { "content-type": "application/json", ...headers } });

describe("POST /api/revalidate", () => {
  it("requires the shared secret", async () => {
    expect((await revalidate(post('{"tags":["entries"]}'))).status).toBe(401);
    expect((await revalidate(post('{"tags":["entries"]}', { authorization: "Bearer wrong" }))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires valid tags immediately", async () => {
    const res = await revalidate(post('{"tags":["entries","entry:has-selector","entries"]}', { authorization: `Bearer ${"r".repeat(40)}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ["entries", "entry:has-selector"] });
    expect(revalidateTag).toHaveBeenCalledWith("entry:has-selector", { expire: 0 });
  });

  it.each(['{"tags":["everything"]}', '{"tags":[]}', '{"tags":["entries"],"x":1}', "not json"])("rejects %s", async (body) => {
    expect((await revalidate(post(body, { authorization: `Bearer ${"r".repeat(40)}` }))).status).toBe(400);
  });
});

describe("POST /api/theme", () => {
  const form = (theme: string, back: string, origin = "https://web.test") => {
    const body = new URLSearchParams({ theme, return_to: back });
    return new Request("https://web.test/api/theme", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded", origin } });
  };

  it("sets the cookie and returns to a safe path", async () => {
    const res = await theme(form("dark", "/e/has?x=1"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/e/has?x=1");
    expect(res.headers.get("set-cookie")).toMatch(/^ws_theme=dark;/);
  });

  it("clears the cookie for system, ignores unknown themes and unsafe return paths", async () => {
    expect((await theme(form("system", "/"))).headers.get("set-cookie")).toMatch(/^ws_theme=; .*Max-Age=0/);
    const res = await theme(form("neon", "https://evil.test"));
    expect(res.headers.get("location")).toBe("/");
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("refuses cross-site posts", async () => {
    expect((await theme(form("dark", "/", "https://evil.test"))).status).toBe(403);
  });
});
