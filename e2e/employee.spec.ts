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

  test("navigate via sidebar: Kolegové → colleagues page", async ({ page }) => {
    await page.getByRole("link", { name: "Kolegové" }).first().click();
    await expect(page).toHaveURL(/\/employee\/colleagues/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Kolegové" })).toBeVisible({ timeout: 15_000 });
  });

  test("navigate via sidebar: Seznam rezervací → appointments list", async ({ page }) => {
    await page.getByRole("link", { name: "Seznam rezervací" }).first().click();
    await expect(page).toHaveURL(/\/employee\/appointments/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Moje rezervace" })).toBeVisible({ timeout: 15_000 });
  });

  test("calendar: Dnes button visible and clickable", async ({ page }) => {
    const todayBtn = page.locator("main").getByRole("button", { name: /Dnes/ });
    await expect(todayBtn).toBeVisible({ timeout: 10_000 });
    await todayBtn.click();
    await expect(page).toHaveURL(/\/employee\/calendar/, { timeout: 5_000 });
  });
});
