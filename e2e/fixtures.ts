/**
 * E2E helpers: login by injecting session (mock) or by login form (real backend).
 * When PLAYWRIGHT_BASE_URL is set we use the form so the real backend issues a valid session.
 */
import { Page } from "@playwright/test";

const SEED_IDS: Record<string, string> = {
  ADMIN: "u-admin",
  RECEPTION: "u-rec",
  EMPLOYEE: "u-emp1",
  CLIENT: "u-client-1",
};

const ROUTES: Record<string, string> = {
  ADMIN: "/admin/users",
  RECEPTION: "/reception/calendar",
  EMPLOYEE: "/employee/calendar",
  CLIENT: "/client/dashboard",
};

export async function loginByRole(page: Page, role: "ADMIN" | "RECEPTION" | "EMPLOYEE" | "CLIENT"): Promise<void> {
  const path = ROUTES[role];
  const useFormLogin = !!process.env.PLAYWRIGHT_BASE_URL;

  if (useFormLogin) {
    await page.goto("/login");
    await page.locator("#role").selectOption(role);
    await page.getByRole("button", { name: /Přihlásit se/i }).click();
    await page.waitForURL(new RegExp(path.replace(/\//g, "\\/")), { timeout: 25_000 });
    return;
  }

  const userId = SEED_IDS[role];
  const session = { userId, role, accessToken: "e2e-fake-token" };
  const user = {
    id: userId,
    email: `${role.toLowerCase()}@test.cz`,
    name: `E2E ${role}`,
    role,
    active: true,
  };
  await page.goto("/login");
  await page.evaluate(
    ({ session, user }) => {
      localStorage.setItem("pristav_session", JSON.stringify(session));
      localStorage.setItem("pristav_user", JSON.stringify(user));
    },
    { session, user }
  );
  await page.goto(path);
  await page.waitForURL(new RegExp(path.replace(/\//g, "\\/")), { timeout: 10_000 });
}
