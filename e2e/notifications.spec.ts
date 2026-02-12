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
    await expect(page.locator("main").getByText(/Oznámení|Načítám|Žádná oznámení/i)).toBeVisible({ timeout: 15_000 });
  });
});
