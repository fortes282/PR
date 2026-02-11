# Test report – průběh testování

Datum: 2026-02-11 (pokračování po prvním kole).

## 1. Backend (HTTP API) – ověřené endpointy

| Oblast | Endpoint / akce | Výsledek |
|--------|------------------|----------|
| **Health** | `GET /ping`, `GET /health` | OK |
| **Auth** | `POST /auth/login` (role: ADMIN, RECEPTION, EMPLOYEE, CLIENT) | OK – vrací user + accessToken |
| **Auth** | `GET /auth/me` (Bearer token) | OK – vrací user |
| **Users** | `GET /users`, `GET /users?role=CLIENT`, `GET /users/:id` | OK |
| **Services** | `GET /services` | OK |
| **Rooms** | `GET /rooms` | OK |
| **Appointments** | `GET /appointments`, `GET /appointments?clientId=`, `GET /appointments/:id` | OK |
| **Appointments** | `POST /appointments` (create) | OK – status SCHEDULED, paymentStatus dle kreditů |
| **Appointments** | `POST /appointments/:id/cancel` | OK – CANCELLED, refund dle pravidel |
| **Appointments** | `POST /appointments/:id/complete` | OK – COMPLETED; po opravě 409 na již dokončené/zrušené |
| **Availability** | `GET /availability?employeeId=&from=&to=` | OK – vrací volné sloty (s booking activations) |
| **Availability** | `GET /availability/bookable-days?from=&to=` | OK – vrací dny s počty volných slotů |
| **Credits** | `GET /credits/:clientId`, `GET /credits/:clientId/transactions` | OK |
| **Credits** | `POST /credits/:clientId/adjust` | OK – 201, transakce vytvořena |
| **Billing** | `POST /billing/reports` (period), `GET /billing/reports/:id` | OK |
| **Waitlist** | `GET /waitlist`, `POST /waitlist`, `GET /waitlist/suggestions`, `POST /waitlist/:id/notify` | OK |
| **Notifications** | `GET /notifications` | OK |
| **Settings** | `GET /settings` | OK |
| **Stats** | `GET /stats/occupancy?from=&to=`, `GET /stats/cancellations`, `GET /stats/client-tags` | OK |
| **Reports** | `GET /reports?clientId=` | OK (prázdný seznam) |
| **Bank transactions** | `GET /bank-transactions?from=&to=` | OK (vyžaduje from, to) |

## 2. Oprava v backendu

- **POST /appointments/:id/complete**
  - **Problém:** Umožňovalo označit jako COMPLETED už zrušenou (CANCELLED) nebo již dokončenou rezervaci.
  - **Úprava:** Před změnou stavu kontrolovat `status`. Pokud je `CANCELLED` → 409 „Cannot complete a cancelled appointment“. Pokud je již `COMPLETED` → 409 „Appointment already completed“.

## 3. Frontend

- **Build:** `pnpm run build` – úspěšný, všech 40 route zbuilděno.
- **Lint + typecheck + unit testy:** Prošly (včetně úpravy RBAC testu – ADMIN smí na /reception).

## 4. Automatické API testy

- **Skript:** `scripts/test-api.mjs`
- **Spuštění:** `pnpm run test:api` (vyžaduje běžící API na http://localhost:3001, např. `pnpm dev:api`).
- Ověřuje: ping, login, users, services, rooms, availability, bookable-days, vytvoření rezervace, complete (včetně 409 při opakování), kredity, adjust, billing report, waitlist, settings, stats, notifications, bank-transactions, reports, booking-activations.

## 5. Další opravy

- **bank-transactions match:** Při označení faktury jako zaplacené se nyní volá `persistInvoice(store, updated)` místo přímého `store.invoices.set`, aby se změna zapsala do DB.

## 6. Co dál (doporučené)

- Manuální E2E v prohlížeči: přihlášení podle rolí, rezervace (klient/recepce), kredity, čekací list, Admin → Pozadí algoritmů (přehled, komunikace, doporučení).
- V HTTP módu: ověřit celý flow od přihlášení po vytvoření rezervace a zrušení v UI.
- Případně přidat integrační testy (např. API client + reálné volání proti testovacímu backendu).
