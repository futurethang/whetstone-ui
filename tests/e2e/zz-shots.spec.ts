import { test } from "@playwright/test";
import { signIn, watchCsp } from "./helpers";
test("shots", async ({ page, context }) => {
  await signIn(context);
  const v = watchCsp(page);
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  for (const [w, h, name] of [[1280, 800, "wide"], [390, 844, "phone"]] as const) {
    await page.setViewportSize({ width: w, height: h });
    const r = await page.goto("/e/container-queries-for-component-layout");
    console.log(name, r?.status());
    await page.screenshot({ path: "/tmp/claude-0/-home-user/c78b596d-8b40-5802-8f12-3026b608176a/scratchpad/entry-" + name + ".png" });
    await page.screenshot({ path: "/tmp/claude-0/-home-user/c78b596d-8b40-5802-8f12-3026b608176a/scratchpad/entry-" + name + "-full.png", fullPage: true });
  }
  for (const p of ["/e/has-selector-relational-styling", "/e/future-status-entry", "/e/old-specificity-hacks", "/e/nope"]) {
    const r = await page.goto(p); console.log(p, r?.status(), (await page.locator("main").innerText()).slice(0, 200).replace(/\n/g, " | "));
  }
  console.log("CSP", JSON.stringify(v));
});
