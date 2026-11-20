import { defineConfig, devices } from "@playwright/test";
import { E2E } from "./tests/e2e/env";


export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${E2E.port}`, trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/mock-api.mjs",
      url: `http://127.0.0.1:${E2E.apiPort}/health`,
      env: { MOCK_API_PORT: String(E2E.apiPort), MOCK_API_TOKEN: E2E.apiToken },
      reuseExistingServer: !process.env.CI,
    },
    {
      // Production build: CSP, caching and cookies behave as they do on Vercel.
      command: `pnpm build && pnpm start -p ${E2E.port}`,
      url: `http://localhost:${E2E.port}/signin`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: {
        WHETSTONE_API_URL: `http://127.0.0.1:${E2E.apiPort}/api`,
        WHETSTONE_API_TOKEN: E2E.apiToken,
        AUTH_SECRET: E2E.authSecret,
        AUTH_GITHUB_ID: "e2e-client-id",
        AUTH_GITHUB_SECRET: "e2e-client-secret",
        OWNER_GITHUB_ID: E2E.ownerId,
        REVALIDATE_SECRET: E2E.revalidateSecret,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
