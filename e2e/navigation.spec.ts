/**
 * E2E: Cross-role navigation – každá role: všechny položky sidebaru vedou na správnou stránku.
 */
import { test, expect } from "@playwright/test";
import { loginByRole } from "./fixtures";

type NavItem = { name: string; url: RegExp; heading?: string };

const CLIENT_NAV: NavItem[] = [
  { name: "Přehled", url: /\/client\/dashboard/, heading: "Vítejte" },
  { name: "Rezervace", url: /\/client\/book/, heading: "Rezervace termínu" },
  { name: "Moje rezervace", url: /\/client\/appointments/, heading: "Moje rezervace" },
  { name: "Kredity", url: /\/client\/credits/, heading: "Kredity" },
  { name: "Zprávy", url: /\/client\/reports/ },
  { name: "Nastavení", url: /\/client\/settings/, heading: "Nastavení" },
  { name: "Čekací list", url: /\/client\/waitlist/ },
];

const RECEPTION_NAV: NavItem[] = [
  { name: "Kalendář", url: /\/reception\/calendar/, heading: "Kalendář" },
  { name: "Pracovní doba", url: /\/reception\/working-hours/, heading: "Nastavení pracovních hodin" },
  { name: "Aktivace rezervací", url: /\/reception\/booking-activation/, heading: "Aktivace rezervací" },
  { name: "Rezervace", url: /\/reception\/appointments/, heading: "Rezervace" },
  { name: "Klienti", url: /\/reception\/clients/, heading: "Klienti" },
  { name: "Čekací list", url: /\/reception\/waitlist/, heading: "Čekací list" },
  { name: "Fakturace", url: /\/reception\/billing/, heading: "Fakturace" },
];

const EMPLOYEE_NAV: NavItem[] = [
  { name: "Rezervace (kalendář)", url: /\/employee\/calendar/, heading: "Můj kalendář" },
  { name: "Lékařská zpráva", url: /\/employee\/medical-reports\/new/ },
  { name: "Kolegové", url: /\/employee\/colleagues/, heading: "Kolegové" },
  { name: "Seznam rezervací", url: /\/employee\/appointments/, heading: "Moje rezervace" },
];

const ADMIN_NAV: NavItem[] = [
  { name: "Uživatelé", url: /\/admin\/users/, heading: "Uživatelé" },
  { name: "Klienti", url: /\/admin\/clients/, heading: "Klienti" },
  { name: "Služby", url: /\/admin\/services/, heading: "Služby" },
  { name: "Místnosti", url: /\/admin\/rooms/, heading: "Místnosti" },
  { name: "Fakturace", url: /\/admin\/billing/, heading: "Fakturace" },
  { name: "Pozadí algoritmů", url: /\/admin\/background/, heading: "Pozadí algoritmů" },
  { name: "Nastavení", url: /\/admin\/settings/, heading: "Nastavení" },
  { name: "Statistiky", url: /\/admin\/stats/, heading: "Statistiky" },
];

test.describe("Navigation – all sidebar links per role", () => {
  test("CLIENT: every sidebar link leads to correct page", async ({ page }) => {
    await loginByRole(page, "CLIENT");
    for (const item of CLIENT_NAV) {
      await page.getByRole("link", { name: item.name }).first().click();
      await expect(page).toHaveURL(item.url, { timeout: 12_000 });
      if (item.heading) {
        await expect(page.getByRole("heading", { name: new RegExp(item.heading, "i") })).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("RECEPTION: every sidebar link leads to correct page", async ({ page }) => {
    await loginByRole(page, "RECEPTION");
    for (const item of RECEPTION_NAV) {
      await page.getByRole("link", { name: item.name }).first().click();
      await expect(page).toHaveURL(item.url, { timeout: 12_000 });
      if (item.heading) {
        await expect(page.getByRole("heading", { name: new RegExp(item.heading, "i") })).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("EMPLOYEE: every sidebar link leads to correct page", async ({ page }) => {
    await loginByRole(page, "EMPLOYEE");
    for (const item of EMPLOYEE_NAV) {
      await page.getByRole("link", { name: item.name }).first().click();
      await expect(page).toHaveURL(item.url, { timeout: 12_000 });
      if (item.heading) {
        await expect(page.getByRole("heading", { name: new RegExp(item.heading, "i") })).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("ADMIN: every sidebar link leads to correct page", async ({ page }) => {
    await loginByRole(page, "ADMIN");
    for (const item of ADMIN_NAV) {
      await page.getByRole("link", { name: item.name }).first().click();
      await expect(page).toHaveURL(item.url, { timeout: 12_000 });
      if (item.heading) {
        await expect(page.getByRole("heading", { name: new RegExp(item.heading, "i") })).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
