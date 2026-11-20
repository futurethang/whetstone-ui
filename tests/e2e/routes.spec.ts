import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, expectNoHorizontalScroll, setTheme, signIn, watchCsp } from "./helpers";

const ROUTES: Array<[string, RegExp]> = [
  ["/", /^Home · Whetstone$/],
  ["/t/css", /^CSS \(css\)/],
  ["/t/css/layout", /^Layout \(css\/layout\)/],
  ["/t/ai-tooling", /^AI tooling/],
  ["/e/container-queries-for-component-layout", /^Prefer container queries/],
  ["/e/has-selector-relational-styling", /^Use :has\(\)/],
  ["/e/future-status-entry", /^An entry with values/],
  ["/search", /^Search · Whetstone$/],
  ["/search?q=container&status=established", /^Search: container/],
  ["/changes", /^Changes/],
  ["/f/container-queries", /^Container queries \(feature\)/],
  ["/pipeline", /^Pipeline/],
  ["/pipeline/sources/smashing", /^Smashing Magazine \(source\)/],
  ["/digest", /^Digest/],
  ["/o/101", /^Observation/],
  ["/i/9001", /^Container queries in practice/],
];

test.describe("every route", () => {
  test.beforeEach(async ({ context }) => signIn(context));

  for (const [path, title] of ROUTES) {
    test(`${path}: renders with one h1, a unique title and no CSP violations`, async ({ page }) => {
      const csp = watchCsp(page);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main#main")).toHaveCount(1);
      await expect(page.getByText("The data could not be loaded")).toHaveCount(0);
      await page.waitForLoadState("networkidle");
      expect(csp).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  for (const theme of ["light", "dark"] as const) {
    for (const [path] of ROUTES) {
      test(`${path}: no axe violations (${theme})`, async ({ page, context }) => {
        await setTheme(context, theme);
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(path);
        await expectNoAxeViolations(page);
      });
    }
  }

  test("every route works without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    await signIn(ctx);
    const page = await ctx.newPage();
    for (const [path, title] of ROUTES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page, path).toHaveTitle(title);
      await expect(page.locator("h1"), path).toHaveCount(1);
      await expect(page.getByText("Loading…"), path).toHaveCount(0);
    }
    await ctx.close();
  });

  test("every route fits 320px without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const [path] of ROUTES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  for (const path of ["/e/nope", "/e/BAD", "/f/nope", "/o/999", "/o/abc", "/i/999", "/pipeline/sources/nope", "/t/nope", "/t/css/nope", "/e/x/trace", "/me", "/digest/2026-W46"]) {
    test(`${path} is a 404`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
      await expect(page.locator("main")).toHaveCount(1);
    });
  }
});

test.describe("entry", () => {
  test.beforeEach(async ({ context }) => signIn(context));

  for (const [w, h] of [[1280, 800], [390, 844]] as const) {
    test(`answers "is this safe to use?" above the fold at ${w}×${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/e/container-queries-for-component-layout");
      const signals = page.getByRole("list", { name: "Entry signals" });
      for (const el of [page.getByRole("heading", { level: 1 }), signals.getByText("Established"), signals.getByText(/High\s*confidence/), signals.getByText(/Widely available/), page.getByRole("heading", { name: "Verdict" })]) {
        await expect(el).toBeInViewport();
      }
    });
  }

  test("evidence tier filter works as links", async ({ page }) => {
    await page.goto("/e/container-queries-for-component-layout");
    const evidence = page.locator("#evidence");
    await expect(evidence.locator("li").filter({ hasText: "Source" })).toHaveCount(2);
    await evidence.getByRole("link", { name: /Normative/ }).click();
    await expect(page).toHaveURL(/\?tier=normative#evidence$/);
    await expect(page.locator("#evidence").getByRole("link", { name: /Normative/ })).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#evidence ul").last().locator("> li")).toHaveCount(1);
  });

  test("unparsed evidence renders as markdown, and remote images become links", async ({ page }) => {
    await page.goto("/e/has-selector-relational-styling");
    await expect(page.locator("#evidence")).toContainText("Evidence written by hand");
    await page.goto("/e/container-queries-for-component-layout");
    await expect(page.locator("img")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Image: diagram/ })).toBeVisible();
  });

  test("unknown values from the API render as text", async ({ page }) => {
    await page.goto("/e/future-status-entry");
    const signals = page.getByRole("list", { name: "Entry signals" });
    await expect(signals).toContainText("speculative");
    await expect(signals).toContainText("Confidence: very-high");
    await expect(signals).toContainText("Origin: import");
  });

  test("history shows status changes with both badges, and epochs collapsed", async ({ page }) => {
    await page.goto("/e/has-selector-relational-styling");
    const history = page.locator("#history");
    await expect(history).toContainText("Status change");
    await expect(history).toContainText("Contested");
    await expect(history.locator("details summary").filter({ hasText: "2025-Q3" })).toBeVisible();
  });
});

test.describe("search", () => {
  test.beforeEach(async ({ context }) => signIn(context));

  test("a filtered URL round-trips: same filters, results and counts", async ({ page }) => {
    const url = "/search?status=emerging&status=established&confidence=high&sort=title";
    await page.goto(url);
    const snapshot = async () => ({
      checked: await page.locator("input:checked").evaluateAll((els) => els.map((e) => `${(e as HTMLInputElement).name}=${(e as HTMLInputElement).value}`)),
      results: await page.locator("article h3").allInnerTexts(),
      heading: await page.locator("#results-h").innerText(),
      counts: await page.locator("fieldset label").allInnerTexts(),
    });
    const first = await snapshot();
    expect(first.checked).toEqual(expect.arrayContaining(["status=emerging", "status=established", "confidence=high"]));
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/status=emerging/);
    expect(await snapshot()).toEqual(first);
  });

  test("chips remove one filter; the empty state offers to remove the last", async ({ page }) => {
    await page.goto("/search?status=deprecated&confidence=low");
    await expect(page.getByText("No entries match")).toBeVisible();
    await page.getByRole("link", { name: /Remove “Confidence: Low”/ }).click();
    await expect(page).toHaveURL(/\/search\?status=deprecated$/);
    await expect(page.locator("#results-h")).toHaveText("1 result");
  });

  test("query terms are highlighted", async ({ page }) => {
    await page.goto("/search?q=container");
    await expect(page.locator("article h3 mark").first()).toHaveText(/container/i);
  });

  test("/ focuses the search field unless typing", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle"); // the shortcut is attached once the page's script has run
    await page.keyboard.press("/");
    await expect(page.locator("#search-q")).toBeFocused();
    await page.keyboard.type("/x");
    await expect(page.locator("#search-q")).toHaveValue("/x");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("/");
    await expect(page.locator("#site-search")).toBeFocused();
  });
});

test.describe("last visit", () => {
  test("Mark all seen moves the since date and the Updated tags disappear", async ({ page, context }) => {
    await signIn(context);
    await context.addCookies([{ name: "ws_last_visit", value: new Date(Date.now() - 20 * 864e5).toISOString(), domain: "localhost", path: "/" }]);
    await page.goto("/search");
    expect(await page.getByText("since your last visit").count()).toBeGreaterThan(0);
    await page.goto("/");
    const since = page.getByRole("heading", { level: 2 }).first();
    const before = await since.innerText();
    expect(before).toMatch(/^Since /);
    await expect(page.locator("main").getByRole("link", { name: /Prefer container queries/ })).toBeVisible();
    await page.getByRole("button", { name: "Mark all seen" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(since).not.toHaveText(before);
    await expect(page.getByText(/^Nothing changed since/)).toBeVisible();
    await page.goto("/search");
    await expect(page.getByText("since your last visit")).toHaveCount(0);
  });
});

test.describe("changes", () => {
  test.beforeEach(async ({ context }) => signIn(context));

  test("groups by week, filters by topic, pages older by four weeks", async ({ page }) => {
    await page.goto("/changes");
    await expect(page.getByRole("heading", { name: /^Week of / }).first()).toBeVisible();
    await page.getByLabel("Topic").selectOption("accessibility");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator("main li").first()).toContainText("Respect prefers-reduced-motion");
    await page.goto("/changes");
    await page.getByRole("link", { name: /^Older:/ }).click();
    await expect(page).toHaveURL(/since=\d{4}-\d{2}-\d{2}&until=\d{4}-\d{2}-\d{2}/);
  });
});

test.describe("pipeline", () => {
  test.beforeEach(async ({ context }) => signIn(context));

  test("lists failing sources first, with budget as text and a meter", async ({ page }) => {
    await page.goto("/pipeline?sort=name");
    await expect(page.getByText("$1.29 of $15.00 spent this month")).toBeVisible();
    await expect(page.locator("meter")).toHaveAttribute("value", "1.2912");
    await expect(page.locator("#sources-h ~ div tbody tr").first()).toContainText("Broken feed");
    await expect(page.getByText("Show error")).toBeVisible();
  });
});

test("320px viewport keeps tables in their own scroll box", async ({ page, context }) => {
  await signIn(context);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/pipeline");
  await expectNoHorizontalScroll(page);
});
