/**
 * Playwright E2E config. Test against deployed app or local (pnpm dev + pnpm dev:api).
 * BASE_URL: default http://localhost:3000 (use PLAYWRIGHT_BASE_URL for deployed).
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  timeout: 30_000,
  expect: { timeout: 10_000 },
});
