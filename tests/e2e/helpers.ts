import AxeBuilder from "@axe-core/playwright";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { E2E } from "./env";
import { SESSION_COOKIE, signSession } from "../../src/auth/session";

/** Sign in as the owner by minting the same session cookie the OAuth callback sets. */
export async function signIn(context: BrowserContext, githubId = E2E.ownerId) {
  const value = await signSession({ githubId, login: "owner" }, E2E.authSecret);
  await context.addCookies([{ name: SESSION_COOKIE, value, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
}

export async function setTheme(context: BrowserContext, theme: "light" | "dark") {
  await context.addCookies([{ name: "ws_theme", value: theme, domain: "localhost", path: "/", sameSite: "Lax" }]);
}

/** Collect CSP violations reported to the console. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) violations.push(m.text());
  });
  return violations;
}

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
