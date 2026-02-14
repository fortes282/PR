/**
 * E2E: Shared – notifications page (any role).
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

test.describe("Notifications", () => {
  test("notifications page loads when logged in as ADMIN", async ({ page }) => {
    await loginByRole(page, "ADMIN");
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/notifications/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Oznámení" })).toBeVisible({ timeout: 15_000 });
  });

  test("navigate to notifications via sidebar from ADMIN", async ({ page }) => {
    await loginByRole(page, "ADMIN");
    await page.getByRole("link", { name: "Oznámení" }).click();
    await expect(page).toHaveURL(/\/notifications/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Oznámení" })).toBeVisible({ timeout: 15_000 });
  });

  test("notifications page loads when logged in as CLIENT", async ({ page }) => {
    await loginByRole(page, "CLIENT");
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/notifications/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Oznámení" })).toBeVisible({ timeout: 15_000 });
  });
});
