/**
 * E2E: Auth – login (all roles), default routes, logout.
 * Requires app running (mock or http backend).
 */
import { test, expect } from "@playwright/test";

const ROLES = ["ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT"] as const;
const DEFAULT_ROUTES: Record<(typeof ROLES)[number], string> = {
  ADMIN: "/admin/users",
  RECEPTION: "/reception/calendar",
  EMPLOYEE: "/employee/calendar",
  CLIENT: "/client/dashboard",
};

test.describe("Auth", () => {
  test("login page loads and shows role selector", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Přístav radosti/i })).toBeVisible();
    await expect(page.locator("#role")).toBeVisible();
    await expect(page.getByRole("button", { name: "Přihlásit se (demo)" })).toBeVisible();
  });

  test("login page shows classic email+password section and register link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "E-mail a heslo" })).toBeVisible();
    await expect(page.getByPlaceholder("E-mail")).toBeVisible();
    await expect(page.getByPlaceholder("Heslo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Přihlásit se", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Registrace klienta \(e-mail/ })).toBeVisible();
  });

  for (const role of ROLES) {
    test(`${role} demo login redirects to default route`, async ({ page }) => {
      await page.goto("/login");
      await page.locator("#role").selectOption(role);
      const btn = page.getByRole("button", { name: "Přihlásit se (demo)" });
      await expect(btn).toBeEnabled();
      await btn.click();
      await expect(page).toHaveURL(new RegExp(DEFAULT_ROUTES[role].replace(/\//g, "\\/")), { timeout: 25_000 });
    });
  }

  test("unauthenticated access to protected route redirects to login", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("CLIENT cannot open admin route", async ({ page }) => {
    const { loginByRole } = await import("./fixtures");
    await loginByRole(page, "CLIENT");
    await expect(page).toHaveURL(/\/client\/dashboard/);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/client\/dashboard/, { timeout: 15_000 });
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    const { loginByRole } = await import("./fixtures");
    await loginByRole(page, "ADMIN");
    await expect(page).toHaveURL(/\/admin/);
    await page.getByRole("button", { name: /Odhlásit/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("after login header shows user and logout button", async ({ page }) => {
    const { loginByRole } = await import("./fixtures");
    await loginByRole(page, "ADMIN");
    await expect(page.getByRole("button", { name: /Odhlásit/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("header").getByText(/Admin|admin/i)).toBeVisible({ timeout: 5_000 });
  });
});
