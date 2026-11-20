import { expect, test } from "@playwright/test";
import { E2E } from "./env";
import { expectNoAxeViolations, expectNoHorizontalScroll, setTheme, signIn, watchCsp } from "./helpers";

test.describe("signed out", () => {
  test("every page redirects to sign-in, keeping the destination", async ({ page }) => {
    await page.goto("/search?q=has");
    await expect(page).toHaveURL(/\/signin\?next=%2Fsearch%3Fq%3Dhas$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    await expect(page).toHaveTitle("Sign in · Whetstone");
  });

  test("a session for another GitHub user is not accepted", async ({ page, context }) => {
    await signIn(context, "1");
    await page.goto("/");
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("sign-in starts GitHub OAuth with state and the registered callback", async ({ request }) => {
    const res = await request.get("/api/auth/signin?next=%2Fchanges", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const to = new URL(res.headers()["location"]!);
    expect(to.origin + to.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(to.searchParams.get("client_id")).toBe("e2e-client-id");
    expect(to.searchParams.get("redirect_uri")).toBe(`http://localhost:${E2E.port}/api/auth/callback/github`);
    expect(to.searchParams.get("state")).toMatch(/.{20,}/);
    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value);
    expect(cookies.some((c) => c.startsWith(`ws_oauth_state=${to.searchParams.get("state")}`) && /HttpOnly/i.test(c))).toBe(true);
  });

  test("the callback refuses a missing or mismatched state", async ({ request }) => {
    const res = await request.get("/api/auth/callback/github?code=x&state=forged", { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()["location"]).toMatch(/\/signin\?error=state$/);
  });

  test("the revalidate webhook needs its secret", async ({ request }) => {
    expect((await request.post("/api/revalidate", { data: { tags: ["topics"] } })).status()).toBe(401);
    const ok = await request.post("/api/revalidate", { data: { tags: ["topics"] }, headers: { authorization: `Bearer ${E2E.revalidateSecret}` } });
    expect(ok.status()).toBe(200);
  });
});

test.describe("signed in", () => {
  test.beforeEach(async ({ context }) => signIn(context));

  test("home renders from the data API", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Home · Whetstone");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Whetstone");
    await expect(page.getByRole("heading", { name: "Topics", level: 2 })).toBeVisible();
    await expect(page.locator("#topics ~ ul > li").filter({ has: page.getByRole("heading", { name: "CSS", exact: true }) })).toContainText("4 entries, 2 stale");
    await expect(page.locator("main#main")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search entries" }).first()).toBeVisible();
  });

  test("unknown pages return 404", async ({ page }) => {
    const res = await page.goto("/nothing-here");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  });

  test("the skip link is the first tab stop and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("theme control works, with and without JavaScript", async ({ page, browser }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "System" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    await signIn(noJs);
    const p = await noJs.newPage();
    await p.goto("/");
    await expect(p.getByRole("heading", { name: "Due for review" })).toBeVisible();
    await p.getByRole("button", { name: "Light" }).click();
    await expect(p.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(p).toHaveURL(`http://localhost:${E2E.port}/`);
    await noJs.close();
  });

  test("sign out clears the session", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/signin\?signed_out=1$/);
    await expect(page.getByText("You are signed out.")).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveURL(/\/signin$/);
  });
});

test.describe("headers and CSP", () => {
  for (const path of ["/signin", "/"]) {
    test(`${path} sends a nonce CSP and security headers, with no violations`, async ({ page, context }) => {
      await signIn(context);
      const violations = watchCsp(page);
      const res = await page.goto(path);
      const h = res!.headers();
      const csp = h["content-security-policy"]!;
      expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).not.toContain("unsafe-inline");
      expect(csp).not.toContain("unsafe-eval");
      expect(h["referrer-policy"]).toBe("same-origin");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["permissions-policy"]).toContain("camera=()");
      expect(h["x-powered-by"]).toBeUndefined();
      // Every script in the server HTML carries this response's nonce; chunks loaded later inherit trust via 'strict-dynamic'.
      const nonce = /'nonce-([^']+)'/.exec(csp)![1]!;
      const tags = [...(await res!.text()).matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.filter((t) => !t.includes(`nonce="${nonce}"`))).toEqual([]);
      await page.waitForLoadState("networkidle");
      expect(violations).toEqual([]);
    });
  }

  test("each request gets a fresh nonce", async ({ request }) => {
    const a = (await request.get("/signin")).headers()["content-security-policy"];
    const b = (await request.get("/signin")).headers()["content-security-policy"];
    expect(a).not.toEqual(b);
  });
});

test.describe("accessibility", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const path of ["/signin", "/", "/nothing-here"]) {
      test(`${path} has no axe violations (${theme})`, async ({ page, context }) => {
        await signIn(context);
        await setTheme(context, theme);
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(path);
        await expectNoAxeViolations(page);
      });
    }
  }

  test("pages fit a 320px viewport without horizontal scroll", async ({ page, context }) => {
    await signIn(context);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const path of ["/", "/signin?next=%2F"]) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
  });
});
