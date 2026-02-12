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

  test("appointments list loads", async ({ page }) => {
    await page.goto("/employee/appointments");
    await expect(page).toHaveURL(/\/employee\/appointments/, { timeout: 15_000 });
  });

  test("colleagues page loads", async ({ page }) => {
    await page.goto("/employee/colleagues");
    await expect(page).toHaveURL(/\/employee\/colleagues/, { timeout: 15_000 });
  });
});
