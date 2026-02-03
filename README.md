zúl)§¨ů:bcghnfxdyse\awQ2É=)
¨# Pristav Radosti — Rehab Center Management (Frontend)

Next.js App Router PWA for multi-role rehab center management. **Frontend only**; all data goes through a data gateway that can use mock (default) or real HTTP.

## Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Login** and choose a role (ADMIN, RECEPTION, EMPLOYEE, CLIENT) to enter the app.

### Running with the backend

To run the app against the real API (Fastify backend in `apps/api`):

1. Set environment variables:
   - `NEXT_PUBLIC_API_MODE=http`
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
2. Start both processes:
   - **Option A:** From repo root run `pnpm dev:all` (starts Next.js and API concurrently).
   - **Option B:** In one terminal run `pnpm dev` (Next.js), in another run `pnpm dev:api` (API on port 3001).
3. Restart the Next.js dev server after changing env so `NEXT_PUBLIC_*` is picked up.

### Environment variables

| Variable | Where | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_MODE` | Frontend | `mock` (default) or `http` |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Backend URL when mode is `http`, e.g. `http://localhost:3001` |
| `PORT` | Backend (apps/api) | API server port (default `3001`) |
| `JWT_SECRET` | Backend (apps/api) | Secret for JWT signing; set a strong value in production |

See `.env.example` for a template.

- **Port 3001:** `pnpm run dev:3001` (dev) or `pnpm run start:3001` (after `pnpm build`).
- **404 on `/_next/static/chunks/...`:** The browser is loading a page that expects the **dev** server (or the opposite). Fix: use one mode only — run `pnpm dev` (or `pnpm run dev:3001`) for development; do a **hard refresh** (Cmd+Shift+R / Ctrl+Shift+R) so the HTML and chunk URLs match the running server. If you use production, run `pnpm build && pnpm start` and open the app fresh (no cached dev HTML).
- **404 or 500 on `/client/settings`, `/client/waitlist`, `/notifications`, etc.:** Usually a corrupted or mixed `.next` build (e.g. "Cannot find module './487.js'"). Fix: stop the server, then `rm -rf .next && pnpm run build`. For dev, then run `pnpm run dev:3001`; for production, `pnpm run start:3001`.

## Acceptance criteria

Feature and quality criteria are defined in **[docs/acceptance-criteria.md](docs/acceptance-criteria.md)**. Summary:

- **General/PWA (G1–G5):** Run (`pnpm install` + `pnpm dev`), manifest, icons at `public/icons/icon-192.png` & `icon-512.png`, offline fallback at `/offline`, `pnpm lint` and `pnpm test` pass.
- **Auth/RBAC (A1–A6):** Login, role-based default routes, route protection, session persistence, logout.
- **Client (C1–C10):** Dashboard, booking (activation, day visuals, confirmation), reservations, credits, reports, settings, waitlist.
- **Reception (R1–R10):** Calendar, working hours, booking activation, appointments (list/new/detail/block), clients, waitlist, billing.
- **Employee (E1–E4):** Calendar, appointments + sign-up, colleagues, client reports.
- **Admin (AD1–AD5):** Users, services, rooms, settings, stats.
- **Shared (S1–S2):** Notifications, offline fallback.
- **Data (D1–D4):** Mock/HTTP modes, activation-aware availability.
- **Behavior (B1–B2):** Optional profile and refund rules.

Use the doc as the source of truth for scope and for manual/automated checks.

## Project structure

- `src/app/` — App Router routes: `(public)/login`, `(client)/client/*`, `(reception)/reception/*`, `(employee)/employee/*`, `(admin)/admin/*`, `notifications/`
- `src/components/` — Layout, nav, calendar, tables, forms, modals
- `src/lib/api/` — **Data gateway**: single abstraction for all data. Implementations:
  - `mock/` — In-memory mock with deterministic seed (default)
  - `http/` — REST client (disabled by default)
- `src/lib/contracts/` — Zod schemas + inferred TS types for DTOs
- `src/lib/auth/` — Session (localStorage) and RBAC (route guard, `can(role, action)`)
- `src/lib/behavior/` — **Behavior algorithm**: events, metrics, scores, tags, notification personalization. See [docs/behavior-algorithm.md](docs/behavior-algorithm.md).

## Backend implementation (apps/api)

The repo includes a Fastify backend in `apps/api` that implements the full API contract used by the frontend. It runs on port **3001** by default.

- **Stack:** Node.js, Fastify, in-memory store (same deterministic seed as the frontend mock), JWT auth.
- **Scripts:** From root, `pnpm dev:api` runs the API; `pnpm dev:all` runs Next.js and API together.
- **Data:** No database required; data is in memory and reseeded on each API process start. You can later swap the store for SQLite or Postgres.

## Backend preparation guide (historical)

### Switch from mock to HTTP

1. Set env:
   - `NEXT_PUBLIC_API_MODE=http`
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` (or your API URL)
2. Implement the backend endpoints below. The frontend already calls them via `src/lib/api/http/httpClient.ts`.

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
