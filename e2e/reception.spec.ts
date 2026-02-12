/**
 * E2E: Reception – calendar, working hours, booking activation, appointments, clients, waitlist, billing.
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

test.describe("Reception", () => {
  test.beforeEach(async ({ page }) => {
    await loginByRole(page, "RECEPTION");
  });

  test("calendar loads", async ({ page }) => {
    await expect(page).toHaveURL(/\/reception\/calendar/);
  });

  test("calendar shows week view and therapist filter", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Kalendář \(týden\)/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByLabel(/Terapeut/)).toBeVisible({ timeout: 10_000 });
  });

  test("working hours page loads", async ({ page }) => {
    await page.goto("/reception/working-hours");
    await expect(page).toHaveURL(/\/reception\/working-hours/, { timeout: 15_000 });
  });

  test("working hours shows heading", async ({ page }) => {
    await page.goto("/reception/working-hours");
    await expect(page.getByRole("heading", { name: /Nastavení pracovních hodin terapeutů/ })).toBeVisible({ timeout: 15_000 });
  });

  test("booking activation page loads", async ({ page }) => {
    await page.goto("/reception/booking-activation");
    await expect(page).toHaveURL(/\/reception\/booking-activation/, { timeout: 15_000 });
  });

  test("booking activation shows table with Terapeut column", async ({ page }) => {
    await page.goto("/reception/booking-activation");
    await expect(page.getByRole("heading", { name: "Aktivace rezervací" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByText("Terapeut").first()).toBeVisible({ timeout: 10_000 });
  });

  test("appointments list loads", async ({ page }) => {
    await page.goto("/reception/appointments");
    await expect(page).toHaveURL(/\/reception\/appointments/, { timeout: 15_000 });
  });

  test("appointments list shows heading and calendar link", async ({ page }) => {
    await page.goto("/reception/appointments");
    await expect(page.getByRole("heading", { name: "Rezervace" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByRole("link", { name: /Zobrazit kalendář|Kalendář/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("new appointment page loads", async ({ page }) => {
    await page.goto("/reception/appointments/new");
    await expect(page).toHaveURL(/\/reception\/appointments\/new/, { timeout: 15_000 });
  });

  test("new appointment form shows Klient select", async ({ page }) => {
    await page.goto("/reception/appointments/new");
    await expect(page.getByRole("heading", { name: "Nová rezervace" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByLabel(/Klient \*/)).toBeVisible({ timeout: 10_000 });
  });

  test("clients list loads", async ({ page }) => {
    await page.goto("/reception/clients");
    await expect(page).toHaveURL(/\/reception\/clients/, { timeout: 15_000 });
  });

  test("clients list shows heading", async ({ page }) => {
    await page.goto("/reception/clients");
    await expect(page.getByRole("heading", { name: "Klienti" })).toBeVisible({ timeout: 15_000 });
  });

  test("waitlist page loads", async ({ page }) => {
    await page.goto("/reception/waitlist");
    await expect(page).toHaveURL(/\/reception\/waitlist/, { timeout: 15_000 });
  });

  test("waitlist shows heading", async ({ page }) => {
    await page.goto("/reception/waitlist");
    await expect(page.getByRole("heading", { name: "Čekací list" })).toBeVisible({ timeout: 15_000 });
  });

  test("billing page loads", async ({ page }) => {
    await page.goto("/reception/billing");
    await expect(page).toHaveURL(/\/reception\/billing/, { timeout: 15_000 });
  });

  test("billing shows heading", async ({ page }) => {
    await page.goto("/reception/billing");
    await expect(page.getByRole("heading", { name: "Fakturace" })).toBeVisible({ timeout: 15_000 });
  });
});
