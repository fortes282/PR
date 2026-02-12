/**
 * E2E: Client role – dashboard, book, appointments, credits, reports, settings, waitlist.
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

test.describe("Client", () => {
  test.beforeEach(async ({ page }) => {
    await loginByRole(page, "CLIENT");
  });

  test("dashboard shows heading and main sections", async ({ page }) => {
    await expect(page.locator("main").getByText(/Přehled|Nejbližší termín|Kredity|Načítám/)).toBeVisible({ timeout: 15_000 });
  });

  test("book page loads", async ({ page }) => {
    await page.goto("/client/book");
    await expect(page).toHaveURL(/\/client\/book/, { timeout: 15_000 });
  });

  test("appointments page loads", async ({ page }) => {
    await page.goto("/client/appointments");
    await expect(page).toHaveURL(/\/client\/appointments/, { timeout: 15_000 });
  });

  test("credits page loads", async ({ page }) => {
    await page.goto("/client/credits");
    await expect(page).toHaveURL(/\/client\/credits/, { timeout: 15_000 });
  });

  test("reports page loads", async ({ page }) => {
    await page.goto("/client/reports");
    await expect(page).toHaveURL(/\/client\/reports/, { timeout: 15_000 });
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/client/settings");
    await expect(page).toHaveURL(/\/client\/settings/, { timeout: 15_000 });
  });

  test("waitlist page loads", async ({ page }) => {
    await page.goto("/client/waitlist");
    await expect(page).toHaveURL(/\/client\/waitlist/, { timeout: 15_000 });
  });
});
