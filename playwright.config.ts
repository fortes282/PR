/**
 * Playwright E2E config. Test against deployed app or local.
 * - PLAYWRIGHT_BASE_URL: test proti nasazené aplikaci (bez startu serveru).
 * - Lokálně: před spuštěním testů spusťte v jiném terminálu: pnpm dev:all (Next 3000 + API 3001).
 *   baseURL = http://localhost:3000. .env s NEXT_PUBLIC_API_MODE=http vytvoří ensure-env-e2e.mjs při prvním test:e2e.
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
