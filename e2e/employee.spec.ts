/**
 * E2E: Employee (therapist) – calendar, appointments, colleagues, client reports.
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

test.describe("Employee", () => {
  test.beforeEach(async ({ page }) => {
    await loginByRole(page, "EMPLOYEE");
  });

  test("calendar loads", async ({ page }) => {
    await expect(page).toHaveURL(/\/employee\/calendar/);
  });

  test("calendar shows heading and day nav", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Můj kalendář" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByRole("button", { name: /Dnes/ })).toBeVisible({ timeout: 10_000 });
  });

  test("appointments list loads", async ({ page }) => {
    await page.goto("/employee/appointments");
    await expect(page).toHaveURL(/\/employee\/appointments/, { timeout: 15_000 });
  });

  test("appointments list shows heading", async ({ page }) => {
    await page.goto("/employee/appointments");
    await expect(page.getByRole("heading", { name: "Moje rezervace" })).toBeVisible({ timeout: 15_000 });
  });

  test("colleagues page loads", async ({ page }) => {
    await page.goto("/employee/colleagues");
    await expect(page).toHaveURL(/\/employee\/colleagues/, { timeout: 15_000 });
  });

  test("colleagues page shows heading", async ({ page }) => {
    await page.goto("/employee/colleagues");
    await expect(page.getByRole("heading", { name: "Kolegové" })).toBeVisible({ timeout: 15_000 });
  });
});
