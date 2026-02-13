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

  test("settings: Uložit vše shows success toast and keeps focus on submit button", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Nastavení" })).toBeVisible({ timeout: 15_000 });
    const saveBtn = page.getByTestId("settings-save-all");
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.getByText("Nastavení bylo uloženo.")).toBeVisible({ timeout: 15_000 });
    const activeTestId = await page.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute("data-testid"));
    expect(activeTestId).toBe("settings-save-all");
  });

  test("settings: SMS section exists and Uložit vše includes it", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Nastavení" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("SMS brána zapnuta")).toBeVisible();
    const smsCheckbox = page.getByRole("checkbox", { name: /SMS brána zapnuta/ });
    await smsCheckbox.check();
    await page.getByTestId("settings-save-all").click();
    await expect(page.getByText("Nastavení bylo uloženo.")).toBeVisible({ timeout: 15_000 });
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
});
