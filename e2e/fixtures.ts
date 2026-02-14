/**
 * E2E helpers: login by login form (role selector + Přihlásit se).
 * Aplikace běží jen s backendem – form login získá platný JWT z API.
 */
import { Page } from "@playwright/test";

const ROUTES: Record<string, string> = {
  ADMIN: "/admin/users",
  RECEPTION: "/reception/calendar",
  EMPLOYEE: "/employee/calendar",
  CLIENT: "/client/dashboard",
};

export async function loginByRole(page: Page, role: "ADMIN" | "RECEPTION" | "EMPLOYEE" | "CLIENT"): Promise<void> {
  const path = ROUTES[role];
  await page.goto("/login");
  await page.locator("#role").selectOption(role);
  await page.getByRole("button", { name: /Přihlásit se/i }).click();
  await page.waitForURL(new RegExp(path.replace(/\//g, "\\/")), { timeout: 25_000 });
}
