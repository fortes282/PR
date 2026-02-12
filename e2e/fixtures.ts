/**
 * E2E helpers: login by injecting session into localStorage and navigating.
 * Use when the app is in mock mode (no real API). For http mode, use the login form.
 */
import { Page } from "@playwright/test";

const SEED_IDS: Record<string, string> = {
  ADMIN: "u-admin",
  RECEPTION: "u-rec",
  EMPLOYEE: "u-emp1",
  CLIENT: "u-client-1",
};

export async function loginByRole(page: Page, role: "ADMIN" | "RECEPTION" | "EMPLOYEE" | "CLIENT"): Promise<void> {
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
  const routes: Record<string, string> = {
    ADMIN: "/admin/users",
    RECEPTION: "/reception/calendar",
    EMPLOYEE: "/employee/calendar",
    CLIENT: "/client/dashboard",
  };
  const path = routes[role];
  await page.goto(path);
  await page.waitForURL(new RegExp(path.replace(/\//g, "\\/")), { timeout: 10_000 });
}
