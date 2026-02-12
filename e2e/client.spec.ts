/**
 * E2E: Client role – dashboard, book, appointments, credits, reports, settings, waitlist.
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

test.describe("Client", () => {
  test.beforeEach(async ({ page }) => {
    await loginByRole(page, "CLIENT");
  });

  test("dashboard shows heading and main sections", async ({ page }) => {
    await expect(page.locator("main").getByText(/Přehled|Nejbližší termín|Kredity|Načítám/)).toBeVisible({ timeout: 15_000 });
  });

  test("dashboard has link to book", async ({ page }) => {
    await expect(page.locator("main").getByRole("link", { name: /Rezervovat termín/ }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("book page loads", async ({ page }) => {
    await page.goto("/client/book");
    await expect(page).toHaveURL(/\/client\/book/, { timeout: 15_000 });
  });

  test("book page shows either bookable days or empty state", async ({ page }) => {
    await page.goto("/client/book");
    await expect(page.getByRole("heading", { name: "Rezervace termínu" })).toBeVisible({ timeout: 15_000 });
    const noDays = page.locator("p").filter({ hasText: "Momentálně nejsou k dispozici žádné dny pro rezervaci" });
    const chooseDayHeading = page.getByRole("heading", { name: "Vyberte den" });
    await expect(noDays.or(chooseDayHeading).first()).toBeVisible({ timeout: 20_000 });
  });

  test("book flow: selecting day and slot opens confirm modal", async ({ page }) => {
    await page.goto("/client/book");
    await expect(page.getByRole("heading", { name: "Rezervace termínu" })).toBeVisible({ timeout: 15_000 });
    const firstGreenDay = page.locator("button.border-emerald-300, button.bg-emerald-50").first();
    if ((await firstGreenDay.count()) === 0) {
      return;
    }
    await firstGreenDay.click();
    await expect(page.getByText(/Dostupní terapeuti/)).toBeVisible({ timeout: 15_000 });
    const slotBtn = page.locator("main button").filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    const reserveBtn = page.locator("main").getByRole("button", { name: "Rezervovat" }).first();
    if ((await slotBtn.count()) > 0) {
      await slotBtn.click();
    } else if ((await reserveBtn.count()) > 0) {
      await reserveBtn.click();
    } else {
      return;
    }
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Potvrdit rezervaci" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("dialog").getByRole("button", { name: "Zrušit" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("appointments page loads", async ({ page }) => {
    await page.goto("/client/appointments");
    await expect(page).toHaveURL(/\/client\/appointments/, { timeout: 15_000 });
  });

  test("appointments page shows heading and Rezervovat link", async ({ page }) => {
    await page.goto("/client/appointments");
    await expect(page.getByRole("heading", { name: /Moje rezervace/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByRole("link", { name: /Rezervovat termín/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("credits page loads", async ({ page }) => {
    await page.goto("/client/credits");
    await expect(page).toHaveURL(/\/client\/credits/, { timeout: 15_000 });
  });

  test("credits page shows balance section", async ({ page }) => {
    await page.goto("/client/credits");
    await expect(page.getByRole("heading", { name: "Kredity" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByText(/Aktuální zůstatek|Kredity jsou spravovány/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("reports page loads", async ({ page }) => {
    await page.goto("/client/reports");
    await expect(page).toHaveURL(/\/client\/reports/, { timeout: 15_000 });
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/client/settings");
    await expect(page).toHaveURL(/\/client\/settings/, { timeout: 15_000 });
  });

  test("waitlist page loads", async ({ page }) => {
    await page.goto("/client/waitlist");
    await expect(page).toHaveURL(/\/client\/waitlist/, { timeout: 15_000 });
  });
});
