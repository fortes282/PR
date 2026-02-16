/**
 * E2E: Behavior-related flows – change password redirects, invite modal, reset skóre modal.
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

test.describe("Change password", () => {
  test("unauthenticated /change-password redirects to login", async ({ page }) => {
    await page.goto("/change-password");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("logged in without mustChangePassword redirects from /change-password to default route", async ({ page }) => {
    await loginByRole(page, "ADMIN");
    await page.goto("/change-password");
    await expect(page).toHaveURL(/\/(admin|reception|employee|client)/, { timeout: 15_000 });
  });
});

test.describe("Admin behavioral UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginByRole(page, "ADMIN");
  });

  test("invite user: modal opens and has email, role, submit", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Uživatelé" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Pozvat uživatele" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByLabel(/E-mail/)).toBeVisible();
    await expect(dialog.getByLabel(/Role/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Pozvat a odeslat e-mail/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Zrušit" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("client detail: reset behavior skóre modal opens and can cancel", async ({ page }) => {
    await page.goto("/admin/clients");
    await expect(page.getByRole("heading", { name: /Klienti/ })).toBeVisible({ timeout: 15_000 });
    const detailLink = page.getByRole("link", { name: "Detail" }).first();
    if ((await detailLink.count()) === 0) return;
    await detailLink.click();
    await expect(page).toHaveURL(/\/admin\/clients\/[^/]+$/);
    const resetBtn = page.getByRole("button", { name: "Resetovat behaviorální skóre" });
    if ((await resetBtn.count()) === 0) return;
    await resetBtn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(/Resetovat behaviorální skóre|skóre klienta/)).toBeVisible();
    await dialog.getByRole("button", { name: "Zrušit" }).click();
    await expect(dialog).not.toBeVisible();
  });
});
