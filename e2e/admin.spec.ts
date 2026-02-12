/**
 * E2E: Admin – users, services, rooms, settings, clients, billing, stats, background.
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

test.describe("Admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginByRole(page, "ADMIN");
  });

  test("users page loads", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator("main").getByText(/Uživatelé|Načítám/)).toBeVisible({ timeout: 20_000 });
  });

  test("users page shows heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Uživatelé" })).toBeVisible({ timeout: 15_000 });
  });

  test("services page loads", async ({ page }) => {
    await page.goto("/admin/services");
    await expect(page).toHaveURL(/\/admin\/services/);
    await expect(page.locator("main").getByText(/Služby|Načítám/)).toBeVisible({ timeout: 20_000 });
  });

  test("services page shows heading", async ({ page }) => {
    await page.goto("/admin/services");
    await expect(page.getByRole("heading", { name: "Služby" })).toBeVisible({ timeout: 15_000 });
  });

  test("rooms page loads", async ({ page }) => {
    await page.goto("/admin/rooms");
    await expect(page).toHaveURL(/\/admin\/rooms/);
    await expect(page.locator("main").getByText(/Místnosti|Načítám/)).toBeVisible({ timeout: 20_000 });
  });

  test("rooms page shows heading", async ({ page }) => {
    await page.goto("/admin/rooms");
    await expect(page.getByRole("heading", { name: "Místnosti" })).toBeVisible({ timeout: 15_000 });
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin\/settings/);
    await expect(page.locator("main").getByText(/Nastavení|free cancel|Fakturace|Načítám/)).toBeVisible({ timeout: 20_000 });
  });

  test("settings page shows heading", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Nastavení" })).toBeVisible({ timeout: 15_000 });
  });

  test("clients page loads", async ({ page }) => {
    await page.goto("/admin/clients");
    await expect(page).toHaveURL(/\/admin\/clients/);
    await expect(page.getByRole("heading", { name: /Klienti/ })).toBeVisible();
  });

  test("billing page loads", async ({ page }) => {
    await page.goto("/admin/billing");
    await expect(page).toHaveURL(/\/admin\/billing/);
    await expect(page.getByRole("heading", { name: /Fakturace \(admin\)/ })).toBeVisible({ timeout: 10_000 });
  });

  test("stats page loads", async ({ page }) => {
    await page.goto("/admin/stats");
    await expect(page).toHaveURL(/\/admin\/stats/);
    await expect(page.locator("main").getByText(/Statistiky|Vytíženost|Načítám/)).toBeVisible({ timeout: 20_000 });
  });

  test("stats page shows heading", async ({ page }) => {
    await page.goto("/admin/stats");
    await expect(page.getByRole("heading", { name: "Statistiky" })).toBeVisible({ timeout: 15_000 });
  });

  test("background page loads", async ({ page }) => {
    await page.goto("/admin/background");
    await expect(page).toHaveURL(/\/admin\/background/);
  });

  test("background page shows heading", async ({ page }) => {
    await page.goto("/admin/background");
    await expect(page.getByRole("heading", { name: "Pozadí algoritmů" })).toBeVisible({ timeout: 15_000 });
  });

  test.skip("Push zapnuty checkbox saves and stays checked after save (round-trip)", async ({ page }) => {
    // Round-trip je ověřen skriptem pnpm test:api (PUT /settings s pushNotificationConfig.enabled, GET ověří persist).
    // E2E vyžaduje platnou session (v mocku inject session nestačí po full page load). Pro plný E2E spusťte s PLAYWRIGHT_BASE_URL a reálným backendem.
    await expect(page.getByRole("heading", { name: "Uživatelé" })).toBeVisible({ timeout: 15_000 });
    await page.locator('a[href="/admin/settings"]').click();
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10_000 });
    const pushSection = page.locator("section").filter({ has: page.getByText("Push notifikace", { exact: true }) });
    await expect(pushSection).toBeVisible({ timeout: 15_000 });

    const checkbox = pushSection.getByTestId("push-enabled-checkbox");
    await expect(checkbox).toBeVisible();
    if (!(await checkbox.isChecked())) await checkbox.click();
    await expect(checkbox).toBeChecked();

    await page.getByRole("button", { name: /Uložit vše/ }).click();
    await expect(page.getByRole("button", { name: "Uložit vše" })).toBeVisible({ timeout: 15_000 });
    await expect(checkbox).toBeChecked();
  });
});
