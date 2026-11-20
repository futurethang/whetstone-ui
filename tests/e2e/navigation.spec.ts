import { expect, test, type Page } from "@playwright/test";
import { signIn, watchCsp } from "./helpers";

/**
 * Navigation feedback and speculation (docs/decisions.md, "Performance"). The mock API answers
 * /sources/slow-e2e-* after 4 s, so a link to /pipeline/sources/slow-e2e-<n> is a slow navigation.
 */

type Pending = { text: string; role: string | null; position: string; height: number; top: number; opacity: string; animationName: string; cls: number };

/**
 * Adds an out-of-flow link to a slow page, collects layout shifts from this point on, and clicks it. Playwright
 * waits for a pending navigation before it queries the page, so the page reports what it shows over the console
 * (which still arrives mid-navigation) as soon as the status text changes.
 */
async function clickSlowLink(page: Page): Promise<Pending> {
  await expect(page.locator("#navigation-status[data-ready]")).toHaveCount(1);
  const report = page.waitForEvent("console", { predicate: (m) => m.text().startsWith("pending:"), timeout: 3000 });
  await page.evaluate((h) => {
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) if (!e.hadRecentInput) cls += e.value;
    }).observe({ type: "layout-shift" });
    const status = document.getElementById("navigation-status")!;
    new MutationObserver(() => {
      const bar = document.querySelector("[data-pending]");
      const cs = bar ? getComputedStyle(bar) : null;
      const r = bar?.getBoundingClientRect();
      console.log(`pending:${JSON.stringify({ text: status.textContent, role: status.getAttribute("role"), position: cs?.position, height: r?.height, top: r?.top, opacity: cs?.opacity, animationName: cs?.animationName, cls })}`);
    }).observe(status, { childList: true, characterData: true, subtree: true });
    const a = document.createElement("a");
    a.href = h;
    a.textContent = "Slow page";
    a.className = "visually-hidden";
    document.body.append(a);
    a.click();
  }, `/pipeline/sources/slow-e2e-${Math.random().toString(36).slice(2, 10)}`);
  return JSON.parse((await report).text().slice("pending:".length)) as Pending;
}

test.describe("navigation feedback", () => {
  test.beforeEach(async ({ context }) => signIn(context));

  test("a slow navigation shows the pending bar, announces it politely and shifts nothing", async ({ page }) => {
    const csp = watchCsp(page);
    await page.goto("/pipeline");
    const status = page.locator("#navigation-status");
    await expect(status).toHaveAttribute("role", "status"); // implicit aria-live="polite"
    await expect(status).toHaveText("");
    await expect(page.locator("[data-pending]")).toHaveCount(0);

    const shown = await clickSlowLink(page);
    expect(shown).toMatchObject({ text: "Loading page", role: "status", position: "fixed", height: 3, top: 0, opacity: "1", cls: 0 });
    expect(shown.animationName).not.toBe("none");
    expect(csp).toEqual([]);
  });

  test("with reduced motion the bar is static", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/pipeline");
    const shown = await clickSlowLink(page);
    expect(shown).toMatchObject({ text: "Loading page", position: "fixed", animationName: "none", cls: 0 });
  });

  test("in-page links, new-tab clicks and other origins do not show it", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const add = (href: string, id: string, target?: string) => {
        const a = document.createElement("a");
        a.href = href;
        a.id = id;
        if (target) a.target = target;
        a.addEventListener("click", (e) => e.preventDefault()); // keep the test on this page
        document.body.append(a);
      };
      add("#topics", "hash");
      add("https://example.com/", "external");
      add("/changes", "blank", "_blank");
    });
    await expect(page.locator("#navigation-status[data-ready]")).toHaveCount(1);
    for (const id of ["hash", "external", "blank"]) await page.evaluate((x) => document.getElementById(x)!.click(), id);
    await page.waitForTimeout(400);
    await expect(page.locator("#navigation-status")).toHaveText("");
    await expect(page.locator("[data-pending]")).toHaveCount(0);
  });

  test("without JavaScript nothing is pending and nothing is hidden", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    await signIn(ctx);
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("#navigation-status")).toHaveText("");
    await expect(page.locator("[data-pending]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pipeline", level: 2 })).toBeVisible();
    await ctx.close();
  });
});

test.describe("speculation rules", () => {
  test("owner pages link the rules; sign-in and API routes do not", async ({ page, request, context }) => {
    const signedOut = await request.get("/signin");
    expect(signedOut.headers()["speculation-rules"]).toBeUndefined();
    await signIn(context);
    const res = await page.goto("/");
    expect(res?.headers()["speculation-rules"]).toBe('"/speculation-rules.json"');
  });

  test("the rules prerender and prefetch same-origin pages, never API routes or sign-in", async ({ context, page }) => {
    await signIn(context);
    const res = await page.request.get("/speculation-rules.json");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/speculationrules+json");
    const rules = await res.json();
    for (const kind of ["prerender", "prefetch"]) {
      expect(rules[kind]).toHaveLength(1);
      expect(rules[kind][0].eagerness).toBe("moderate");
      expect(JSON.stringify(rules[kind][0].where)).toContain('{"not":{"href_matches":"/api/*"}}');
      expect(JSON.stringify(rules[kind][0].where)).toContain('{"not":{"href_matches":"/signin"}}');
    }
  });

  test("hovering a link fetches the page ahead with the session and a nonce CSP", async ({ context, page }) => {
    await signIn(context);
    const csp = watchCsp(page);
    await page.goto("/");
    // Chrome prerenders where it can; under automation it falls back to the prefetch rule.
    const ahead = page.waitForResponse((r) => r.url().endsWith("/changes") && /prefetch/.test(r.request().headers()["sec-purpose"] ?? ""));
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Changes" }).hover();
    const r = await ahead;
    expect(r.status()).toBe(200);
    expect(r.headers()["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Changes" }).click();
    await expect(page).toHaveTitle(/^Changes/);
    expect(csp).toEqual([]);
  });
});
