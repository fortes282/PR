# Pristav Radosti — Rehab Center Management

Next.js App Router PWA for multi-role rehab center management. **Aplikace vyžaduje běžící backend** (Fastify API v `apps/api` s SQLite). Bez něj se zobrazí hláška „Backend neběží“. Mock režim není podporován.

**Návod k nasazení (lokálně i na Railway):** **[NASAZENI.md](NASAZENI.md)**  
Přehled funkcí a infrastruktury: **[docs/About.md](docs/About.md)**

## Rychlý start (lokálně)

1. **Backend:** Z kořene repozitáře spusťte API (např. `pnpm dev:api`). Běží na http://localhost:3001.
2. **Frontend:** V `.env.local` nastavte:
   - `NEXT_PUBLIC_API_MODE=http`
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
3. Spusťte Next.js: `pnpm dev` → http://localhost:3000.

Nebo obojí najednou: `pnpm dev:all` (z kořene).

Po změně `NEXT_PUBLIC_*` vždy restartujte Next.js. Podrobný postup včetně produkce: **[NASAZENI.md](NASAZENI.md)**.

### Environment variables (základ)

| Variable | Kde | Popis |
|----------|-----|-------|
| `NEXT_PUBLIC_API_MODE` | Frontend | **http** (povinné) – bez toho se zobrazí „Backend neběží“ |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | URL backendu, např. `http://localhost:3001` |
| `PORT` | Backend | Port API (default 3001) |
| `JWT_SECRET` | Backend | Secret pro JWT; v produkci silný náhodný řetězec |
| `DATABASE_PATH` | Backend | Cesta k SQLite; v produkci např. na Volume |

Více v `.env.example` a **[NASAZENI.md](NASAZENI.md)**.

### Jak ověřit, že běží frontend, backend a databáze

1. **Frontend (Next.js)**  
   Otevřete [http://localhost:3000](http://localhost:3000). Měla by se načíst přihlašovací stránka. **Důležité:** Spouštějte vždy z **kořene repozitáře** (`/Users/.../PR`), ne z `apps/web`. Při `pnpm dev:all` musí v terminálu u procesu `[next]` být hláška „Ready“ a „Local: http://localhost:3000“. Pokud vidíte 404 na portu 3000, zastavte procesy (Ctrl+C), smažte cache (`rm -rf .next`), znovu spusťte `pnpm dev:all` a otevřete http://localhost:3000 v **novém** tabu (nebo tvrdý refresh).

2. **Backend (API)**  
   V prohlížeči nebo v terminálu:  
   `curl http://localhost:3001/`  
   Očekávaná odpověď: `{"ok":true,"service":"api"}`.  
   Pokud ne, spusťte v druhém terminálu `pnpm dev:api` (nebo `pnpm dev:all` z kořene).

3. **Databáze (SQLite)**  
   `curl http://localhost:3001/health`  
   Očekávaná odpověď: `{"ok":true,"service":"api","database":"connected"}`.  
   Pokud je `"database":"error"`, backend běží, ale připojení k SQLite selhalo (zkuste `pnpm build:sqlite` z kořene projektu).

4. **Nastavení (Admin)**  
   Nastavení se ukládá do databáze na backendu (vždy, když je backend připojen).

- **Port 3001:** `pnpm run dev:3001` (dev) or `pnpm run start:3001` (after `pnpm build`).
- **404 on `/_next/static/chunks/...`:** The browser is loading a page that expects the **dev** server (or the opposite). Fix: use one mode only — run `pnpm dev` (or `pnpm run dev:3001`) for development; do a **hard refresh** (Cmd+Shift+R / Ctrl+Shift+R) so the HTML and chunk URLs match the running server. If you use production, run `pnpm build && pnpm start` and open the app fresh (no cached dev HTML).
- **404 or 500 on `/client/settings`, `/client/waitlist`, `/notifications`, etc.:** Usually a corrupted or mixed `.next` build (e.g. "Cannot find module './487.js'"). Fix: stop the server, then `rm -rf .next && pnpm run build`. For dev, then run `pnpm run dev:3001`; for production, `pnpm run start:3001`.
- **500 on `/admin/background` or on `_next/static/chunks/main.js`, `webpack.js`, `pages/_app.js`, `pages/_error.js`:** Same cause: bad or mixed `.next` so the dev server fails when compiling or serving chunks. Fix: **stop the dev server** (Ctrl+C), then run `rm -rf .next` and start dev again with `pnpm dev` (or `pnpm run dev:3001`). Use a fresh tab or hard refresh after the dev server is ready.
- **API: „Could not locate the bindings file“ (better-sqlite3):** Spusťte z kořene `pnpm build:sqlite`. Pokud to nepomůže, nainstalujte Xcode Command Line Tools (`xcode-select --install` na Macu) a zkuste znovu.
- **Next: „Failed to download Plus Jakarta Sans from Google Fonts“ (ENOTFOUND):** Při offline nebo bez DNS se font nestáhne; aplikace použije náhradní font. Není to chyba.
- **Repeated 404 for `http://localhost:3000/`:** Often from prefetch or a bad dev build. Ensure you run `pnpm dev` from the **repo root** (so the app with `src/app/page.tsx` is used). Then do `rm -rf .next && pnpm dev`, open http://localhost:3000 in a new tab and hard refresh. Links to "/" use `prefetch={false}` to avoid unnecessary prefetch requests.
- **„2 Chyby načítání mapy zdrojů“ / 404 pro `LayoutGroupContext.mjs.map`:** Jde jen o chybějící source mapy v dev režimu (interní Next.js chunky). Aplikace funguje; v konzoli můžete tyto zprávy ignorovat nebo skrýt filtrem. Na funkci stránky to nemá vliv.

## Documentation

- **[docs/About.md](docs/About.md)** — Full overview: all features, infrastructure, how everything works, deployment, operations, and usage. Start here for a complete picture.
- **[docs/acceptance-criteria.md](docs/acceptance-criteria.md)** — Formal acceptance and quality criteria.
- **[docs/application-features.md](docs/application-features.md)** — Feature list by role; API and UI notes.
- **[docs/behavior-algorithm.md](docs/behavior-algorithm.md)** — Behavior scoring and tags.
- **[docs/billing-and-financial-management.md](docs/billing-and-financial-management.md)** — Billing and invoicing.

## Acceptance criteria

Feature and quality criteria are defined in **[docs/acceptance-criteria.md](docs/acceptance-criteria.md)**. Summary:

- **General/PWA (G1–G5):** Run (`pnpm install` + `pnpm dev`), manifest, icons at `public/icons/icon-192.png` & `icon-512.png`, offline fallback at `/offline`, `pnpm lint` and `pnpm test` pass.
- **Auth/RBAC (A1–A6):** Login, role-based default routes, route protection, session persistence, logout.
- **Client (C1–C10):** Dashboard, booking (activation, day visuals, confirmation), reservations, credits, reports, settings, waitlist.
- **Reception (R1–R10):** Calendar, working hours, booking activation, appointments (list/new/detail/block), clients, waitlist, billing.
- **Employee (E1–E4):** Calendar, appointments + sign-up, colleagues, client reports.
- **Admin (AD1–AD5):** Users, services, rooms, settings, stats.
- **Shared (S1–S2):** Notifications, offline fallback.
- **Data (D1–D4):** Backend-only (HTTP), activation-aware availability.
- **Behavior (B1–B2):** Optional profile and refund rules.

Use the doc as the source of truth for scope and for manual/automated checks.

## Project structure

- `src/app/` — App Router routes: `(public)/login`, `(client)/client/*`, `(reception)/reception/*`, `(employee)/employee/*`, `(admin)/admin/*`, `notifications/`
- `src/components/` — Layout, nav, calendar, tables, forms, modals
- `src/lib/api/` — **Data gateway**: REST klient k backendu (`http/`). Aplikace běží pouze s `NEXT_PUBLIC_API_MODE=http`.
- `src/lib/contracts/` — Zod schemas + inferred TS types for DTOs
- `src/lib/auth/` — Session (localStorage) and RBAC (route guard, `can(role, action)`)
- `src/lib/behavior/` — **Behavior algorithm**: events, metrics, scores, tags, notification personalization. See [docs/behavior-algorithm.md](docs/behavior-algorithm.md).

## Backend implementation (apps/api)

The repo includes a Fastify backend in `apps/api` that implements the full API contract used by the frontend. It runs on port **3001** by default.

- **Stack:** Node.js, Fastify, **SQLite** (persistent), Drizzle ORM, JWT auth.
- **Scripts:** From root, `pnpm dev:api` runs the API; `pnpm dev:all` runs Next.js and API together.
- **Data:** Data is stored in a **SQLite** file. On first start (empty DB), seed data is loaded and saved; on later starts the DB is loaded into memory. All writes go to both memory and SQLite so data survives restarts.
- **Database:** Path is `./data/pristav.db` by default. Override with `DATABASE_PATH` (e.g. `/var/lib/pristav/pristav.db` in production). Back up this file regularly.
- **Native dependency:** `better-sqlite3` must be compiled. If you see "Could not locate the bindings file", run from repo root: `pnpm build:sqlite` or `pnpm rebuild better-sqlite3`.
- Některé endpointy (medical reports, behavior scores, client profile log) vrací prázdná data přes proxy, pokud je backend nemá – viz proxy fallback v `src/app/api/proxy/`.

## Backend – přehled

Návod k nasazení backendu i frontendu: **[NASAZENI.md](NASAZENI.md)**. Shrnutí:

### Auth strategy

- **Login:** `POST /auth/login`  
  Body: `{ email?, password?, role? }` (role for dev).  
  Returns: `{ user: User, accessToken, refreshToken?, expiresIn }`.  
  Errors: `401` invalid credentials.

- **Me:** `GET /auth/me`  
  Headers: `Authorization: Bearer <accessToken>`.  
  Returns: `{ user: User }` or `401`.

- **Token refresh:** Backend should support refresh token flow; frontend will call refresh on `401` (add logic in `httpClient` fetch wrapper).

- **RBAC:** Server must enforce permissions; frontend RBAC is for UI only.

### Backend endpoints list

| Method | Path | Body / Query | Returns | Notes |
|--------|------|--------------|--------|------|
| POST | `/auth/login` | `{ email?, password?, role? }` | `{ user, accessToken, refreshToken?, expiresIn }` | |
| GET | `/auth/me` | — | `{ user }` | Header: `Authorization: Bearer <token>` |
| GET | `/users` | `?role=&search=&page=&limit=` | `{ users, total }` | |
| GET | `/users/:id` | — | `User` | |
| PUT | `/users/:id` | `UserUpdate` | `User` | |
| GET | `/services` | — | `Service[]` | |
| POST | `/services` | `ServiceCreate` | `Service` | |
| PUT | `/services/:id` | `ServiceUpdate` | `Service` | |
| GET | `/rooms` | — | `Room[]` | |
| POST | `/rooms` | `RoomCreate` | `Room` | |
| PUT | `/rooms/:id` | `RoomUpdate` | `Room` | |
| GET | `/appointments` | `?clientId=&employeeId=&from=&to=&status=` | `Appointment[]` | |
| GET | `/appointments/:id` | — | `Appointment` | |
| POST | `/appointments` | `AppointmentCreate` | `Appointment` | Deduct credits if enough; set PAID/UNPAID |
| PUT | `/appointments/:id` | `AppointmentUpdate` | `Appointment` | |
| POST | `/appointments/:id/cancel` | `{ refund?, reason? }` | `{ appointment, creditTransaction? }` | 403 RBAC, 409 already cancelled |
| POST | `/appointments/:id/complete` | — | `Appointment` | |
| GET | `/credits/:clientId` | — | `CreditAccount` | |
| GET | `/credits/:clientId/transactions` | — | `CreditTransaction[]` | |
| POST | `/credits/:clientId/adjust` | `{ amountCzk, reason }` | `CreditTransaction` | |
| POST | `/billing/reports` | `{ period: { year, month } }` | `BillingReport` | |
| GET | `/billing/reports/:id` | — | `BillingReport` | |
| GET | `/billing/reports/:id/export` | — | CSV string or blob | |
| POST | `/billing/reports/mark-invoiced` | `{ appointmentIds: string[] }` | — | Set appointment status to INVOICED |
| GET | `/waitlist` | — | `WaitingListEntry[]` | |
| POST | `/waitlist` | entry (no id/createdAt) | `WaitingListEntry` | |
| PUT | `/waitlist/:id` | partial entry | `WaitingListEntry` | |
| GET | `/waitlist/suggestions` | `?slotStart=&slotEnd=&serviceId=` | `WaitlistSuggestion[]` | |
| POST | `/waitlist/:id/notify` | — | — | Send offer notification |
| POST | `/reports/upload` | multipart (clientId, file) or presigned URL | `ReportUploadResult` | S3 presigned URLs suggested |
| GET | `/reports` | `?clientId=` | `TherapyReportFile[]` | |
| GET | `/reports/:id/download` | — | file blob | |
| PATCH | `/reports/:id` | `{ visibleToClient }` | `TherapyReportFile` | |
| GET | `/notifications` | `?read=&limit=` | `Notification[]` | |
| POST | `/notifications/send` | `NotificationSendBody` | — | |
| PATCH | `/notifications/:id/read` | — | — | |
| GET | `/settings` | — | `Settings` | |
| PUT | `/settings` | `SettingsUpdate` | `Settings` | Admin only |
| GET | `/stats/occupancy` | `?from=&to=` | `OccupancyStat[]` | |
| GET | `/stats/cancellations` | `?from=&to=` | `CancellationStat[]` | |
| GET | `/stats/client-tags` | — | `ClientTagStat[]` | |

### Payload shapes (Zod + TS)

All DTOs are in `src/lib/contracts/`: `auth`, `users`, `services`, `rooms`, `appointments`, `credits`, `billing`, `notifications`, `reports`, `waitlist`, `settings`, `stats`. Use Zod schemas for validation; types are inferred.

### Error conventions

- Use **problem+json** (RFC 7807) or consistent JSON: `{ code, message, details? }`.
- Status: `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict (e.g. already cancelled).

### Which pages call which endpoints

- **Login:** `auth.login`, `auth.me`
- **Client dashboard:** `appointments.list`, `credits.get`
- **Client book:** `settings.get`, `services.list`, `rooms.list`, `users.list`, `appointments.create`
- **Client appointments:** `appointments.list`, `settings.get`, `appointments.cancel`
- **Client credits/reports/settings/waitlist:** `credits.*`, `reports.*`, `notifications.list`, `waitlist.list`
- **Reception calendar:** `appointments.list`, `users.list`
- **Reception appointment detail:** `appointments.get`, `settings.get`, `appointments.cancel`
- **Reception clients:** `users.list`, `credits.*`, `appointments.list`
- **Reception waitlist:** `waitlist.list`, `waitlist.suggestions`, `waitlist.notify`
- **Reception billing:** `billing.generateMonthly`, `billing.getReport`, `billing.exportCsv`, `billing.markInvoiced`
- **Employee calendar:** `appointments.list`, `users.list`
- **Employee appointment detail:** `appointments.get`, `appointments.update`
- **Employee client reports:** `reports.list`, `reports.upload`, `reports.updateVisibility`, `reports.download`
- **Admin:** `users.*`, `services.*`, `rooms.*`, `settings.*`, `stats.*`
- **Notifications:** `notifications.list`, `notifications.read`

## PWA

- Manifest: `src/app/manifest.ts` (name, theme color, icons). Satisfies **G2**.
- Icons ( **G3** ): ensure `public/icons/icon-192.png` and `public/icons/icon-512.png` exist; the manifest references `/icons/icon-192.png` and `/icons/icon-512.png`.
- Offline ( **G4**, **S2** ): `public/sw.js` caches the `/offline` page and serves it for navigation requests when the network is unavailable; fallback page at `src/app/offline/page.tsx`.
- For full PWA (e.g. install prompt, more caching), consider `@ducanh2912/next-pwa` or Next.js built-in PWA support.

## Quality

- TypeScript strict. **G5**: `pnpm lint` and `pnpm test` must pass.
- ESLint: `pnpm lint`.
- Tests: `pnpm test` (Jest; key pure functions: refund decision, booking window, billing totals). See [docs/acceptance-criteria.md](docs/acceptance-criteria.md) for full criteria.
