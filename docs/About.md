# Pristav Radosti — About

This document is the **single comprehensive reference** for the Pristav Radosti rehab center management system: features, infrastructure, deployment, operations, and usage.

---

## 1. Project overview

**Pristav Radosti** is a multi-role web application for managing a rehabilitation center. It supports:

- **Clients**: Dashboard, self-service booking, reservations, credits, therapy reports, notifications, settings, waitlist.
- **Reception**: Calendar, working hours, booking activation, appointments (single and blocks), clients, waitlist, billing and invoices.
- **Therapists (employees)**: Day-timeline calendar with real-time “now” line, reservations, client health records and medical reports, colleague list.
- **Administrators**: Users and roles, services, rooms, global settings, client list and detail (including push preferences and password reset), billing, statistics, behavior/recommendations background.

The app is a **Next.js PWA** (App Router) with a **unified data gateway** that can use either an **in-memory mock** (default, no backend) or a **real HTTP API**. A **Fastify + SQLite** backend in `apps/api` implements most of the API contract for production use.

---

## 2. Feature overview by role

### 2.1 Client

| Feature | Route / location | Description |
|--------|-------------------|-------------|
| Dashboard | `/client/dashboard` | Next appointment, credit balance, link to booking. |
| Booking | `/client/book` | Bookable days only (activation-driven). Green/red day indicators, few-slots icon. Therapist cards with slots; **confirmation modal** before creating a reservation. |
| My reservations | `/client/appointments` | List with status and payment; cancel where policy allows. |
| Credits | `/client/credits` | Balance and transaction history (read-only). |
| Reports | `/client/reports` | Therapy reports/documents visible to the client. |
| Settings | `/client/settings` | E-mail/SMS notification toggles (reminders, marketing). **Push**: “Povolit push notifikace” / “Zrušit push” only; push type toggles (reminders, marketing) are set by **admin** in client detail. |
| Waitlist | `/client/waitlist` | View own waitlist entry if any. |
| Push prompt | Banner (layout) | If admin left “prompt to enable push” on, a banner appears on every open until the client enables push or admin disables the prompt. |

### 2.2 Reception

| Feature | Route | Description |
|--------|--------|-------------|
| Calendar | `/reception/calendar` | Week view, month nav, therapist filter, occupancy (red–green), slot clicks to appointment detail. |
| Working hours | `/reception/working-hours` | Per-therapist: weekly schedule, lunch breaks, default price; copy day to week. |
| Booking activation | `/reception/booking-activation` | Enable/disable client self-booking per therapist per month. |
| Appointments | `/reception/appointments` | List (filters: date, client, therapist), new single, new block, detail (notifications, mark paid). |
| Clients | `/reception/clients` | List (search, bulk e-mail/SMS), detail: billing data, credits, transactions, appointments, **Health Record** link, **Medical reports** list (PDF/DOCX download), profile log. |
| Health Record | `/reception/clients/[id]/health-record` | Edit diagnosis and child’s date of birth (prefill for medical reports). |
| Waitlist | `/reception/waitlist` | Entries and suggestions. |
| Billing | `/reception/billing` | Generate report by period, unpaid list, generate invoice per client, list invoices (overdue in red), send individual/bulk, overdue reminders. |
| Invoices | `/reception/invoices/[id]` | Edit number, due date, amount, recipient. |

### 2.3 Employee (therapist)

| Feature | Route | Description |
|--------|--------|-------------|
| Calendar | `/employee/calendar` | **Day timeline** (single day, 7:00–20:00), date nav, **real-time “Teď” line** when viewing today. Click slot → appointment detail. |
| Reservations list | `/employee/appointments` | Table of own appointments. |
| Appointment detail | `/employee/appointments/[id]` | **Client card**: name, last visit, diagnosis, child DOB, links to Health Record and Medical reports, recent reports (PDF/DOCX). Internal notes, sign-up for unassigned slots. |
| Medical report (new) | `/employee/medical-reports/new` | Search client by name → select → form with prefilled (name, address, child name, child DOB, report date) and manual fields (diagnosis, condition, treatment, recommendations). Save → stored on client. |
| Health Record | `/employee/clients/[id]/health-record` | View/edit diagnosis and child’s date of birth. |
| Medical reports | `/employee/clients/[id]/medical-reports` | List reports for client, download PDF/DOCX. |
| Client reports (files) | `/employee/clients/[id]/reports` | Upload and manage therapy report files, visibility to client. |
| Colleagues | `/employee/colleagues` | List other employees. |

### 2.4 Admin

| Feature | Route | Description |
|--------|--------|-------------|
| Users | `/admin/users` | List, edit; **only admin** can change role and active status. |
| Clients | `/admin/clients` | Same list/detail as reception; **Push notifikace (nastavuje pouze admin)**: toggles for “Připomínky termínů (push)” and “Novinky a akce (push)” per client. Reset password + send e-mail. |
| Health Record | `/admin/clients/[id]/health-record` | Same as reception. |
| Services | `/admin/services` | CRUD (type, duration, price). |
| Rooms | `/admin/rooms` | CRUD. |
| Settings | `/admin/settings` | Free cancel hours; invoice numbering and issuer; notification e-mail sender; SMS (FAYN); reservation reminder timing; **Push**: VAPID, TTL, icon/badge; **Zobrazovat klientům výzvu k zapnutí push** (enable/disable repeated prompt). |
| Billing | `/admin/billing` | Same as reception. |
| Stats | `/admin/stats` | Occupancy, cancellations, client tags. |
| Background | `/admin/background` | Behavior evaluations, sent communications, recommendations. |

### 2.5 Shared / public

| Feature | Route | Description |
|--------|--------|-------------|
| Login | `/login` | E-mail/password or dev role selection. |
| Register | `/register` | Client self-registration; optional SMS verification. |
| Verify | `/verify` | Verification flow placeholder. |
| Notifications | `/notifications` | In-app notification list and read state. |
| Offline | `/offline` | Fallback when offline or server unreachable. |

---

## 3. Infrastructure

### 3.1 Monorepo layout

```
PR/
├── package.json          # Root: Next.js app, scripts (dev, dev:all, build, test, lint)
├── pnpm-workspace.yaml   # Workspace: ".", "apps/*", "packages/*"
├── src/                  # Next.js App Router app (main frontend)
│   ├── app/              # Routes: (public), (client), (reception), (employee), (admin), notifications, offline
│   ├── components/       # Layout, calendar, tables, forms, modals, UI
│   └── lib/              # API gateway, contracts, auth, behavior, push, utils
├── apps/
│   └── api/              # Fastify backend (port 3001), SQLite, Drizzle
├── packages/
│   └── shared/           # @pristav/shared: Zod schemas and types (auth, users, appointments, …)
├── docs/                 # Documentation (this file, application-features, behavior, billing, …)
├── public/               # PWA: sw.js, icons
└── .env.example          # Template for env vars
```

- **Root** (`pnpm dev`, `pnpm build`): Next.js frontend. Always run from repo root.
- **apps/api**: Standalone API server; run with `pnpm dev:api` or `pnpm --filter api dev`.
- **packages/shared**: Consumed by root and apps/api; no runtime of its own.

### 3.2 Frontend (Next.js)

- **Framework**: Next.js 14 (App Router), React 18, TypeScript.
- **Data**: Single gateway in `src/lib/api/index.ts`. Two implementations:
  - **MockApiClient** (default): `src/lib/api/mock/mockClient.ts` + `mockDb.ts` + `seed.ts`. In-memory, deterministic seed. No backend required.
  - **HttpApiClient**: `src/lib/api/http/httpClient.ts`. REST calls to `NEXT_PUBLIC_API_BASE_URL`. Active when `NEXT_PUBLIC_API_MODE=http`.
- **Auth**: Session in `localStorage`; RBAC in `src/lib/auth/` (route guard, default routes, `can(role, action)`).
- **Contracts**: Types and Zod schemas from `@pristav/shared` (re-exported via `src/lib/contracts`).
- **PWA**: Manifest (`src/app/manifest.ts`), icons under `public/icons/`, offline fallback (`public/sw.js`, `/offline`).

### 3.3 Backend (Fastify + SQLite)

- **Stack**: Node.js, Fastify, SQLite via **better-sqlite3**, Drizzle ORM, JWT (jsonwebtoken).
- **Location**: `apps/api/`.
- **Port**: 3001 (configurable via `PORT`).
- **Data**: SQLite file (default `./data/pristav.db`). On first start with empty DB: run migrations, seed, persist. On later starts: load DB into in-memory store. Writes go to both store and SQLite.
- **Routes**: auth, users, services, rooms, appointments, credits, availability, booking-activations, billing, invoices, bank-transactions, waitlist, reports, notifications, settings, stats. CORS enabled; multipart for file uploads.
- **Auth**: JWT in `Authorization: Bearer <token>`. Login supports email/password or dev `role` for testing.

### 3.4 What the backend does **not** implement (HTTP mode)

When using `NEXT_PUBLIC_API_MODE=http`, the frontend also calls:

- **Medical reports**: `GET/POST /medical-reports`, `GET /medical-reports/:id`, `GET /medical-reports/:id/export/pdf`, `.../export/docx`. Not implemented in apps/api; will 404. Use **mock mode** for full medical reports workflow or add these routes and storage.
- **Behavior scores**: `GET /behavior/scores?clientIds=`. Not implemented; 404. Client list behavioral score and unpaid indicators work only in mock mode unless you add this endpoint (e.g. derive events from appointments and call `computeBehaviorProfile`).
- **Client profile log**: `GET /client-profile-log?clientId=`. Not implemented; 404. Profile log in client detail works only in mock mode unless you add the route and DB table.

So for **full feature parity in production**, either add these in the backend or keep using mock for development/demo.

---

## 4. How it works (concepts)

### 4.1 Authentication and RBAC

- **Login**: POST to backend (or mock) with credentials or dev role; returns user + JWT. Frontend stores session (userId, role, accessToken, expiresAt) in localStorage.
- **Routes**: Each layout/route group is role-specific. Unauthenticated → `/login`. Wrong role → redirect to default route for that role. Default routes: Admin → `/admin/users`, Reception → `/reception/calendar`, Employee → `/employee/calendar`, Client → `/client/dashboard`.
- **Permissions**: `can(role, action)` in `src/lib/auth/rbac.ts` drives UI (e.g. who can change role). Backend should enforce the same rules.

### 4.2 Booking and availability

- **Activation**: Reception turns client self-booking **on/off per therapist per month**. Only activated months (with working hours) produce bookable days.
- **Availability**: `availability.list(employeeId, from, to)` returns free slots only in activated months. `availability.bookableDays(from, to)` returns day-level counts for the client calendar (green/red/few-slots).
- **Reservation creation**: Client selects slot and confirms in a modal; then `appointments.create`. If client has enough credit, appointment is PAID and credit is deducted; otherwise UNPAID.

### 4.3 Credits and billing

- Credits are per client. Adjustments (reception/admin) create transactions and can log to client profile.
- **Billing report**: By period (month/year); lists unpaid appointments per client. From report, reception/admin generate **invoices** (one per client). Invoice numbering and issuer come from admin settings. Invoices can be sent individually or in bulk; overdue reminders supported.
- **Mark as paid**: On appointment detail, reception can mark an unpaid reservation as paid without credit (e.g. cash).

### 4.4 Medical reports and health record

- **Health record** (per client): Diagnosis and child’s date of birth. Editable in client detail (reception, admin, employee). Stored on user; prefills new medical reports.
- **Medical reports**: Therapist creates from `/employee/medical-reports/new` (search client → form). Prefilled: client name, address, child name, child DOB, report date. Manual: diagnosis, current condition, planned treatment, recommendations. Reports are stored and listed in client detail; downloadable as PDF and DOCX (mock returns blob; real PDF/DOCX generation can be added).

### 4.5 Push notifications

- **Admin settings**: VAPID public key, TTL, icon/badge, and **“Zobrazovat klientům výzvu k zapnutí push”** (show prompt to enable push on each open).
- **Client**: Can only enable/disable push subscription in settings. **Připomínky termínů (push)** and **Novinky a akce (push)** are toggled **only by admin** in client detail.
- **Prompt**: If the admin setting is on and the client is not subscribed, a banner appears at the top of the client app on every open until they enable push or admin turns the prompt off.

### 4.6 Behavior algorithm (optional)

- **Location**: `src/lib/behavior/`. Events → metrics → scores → tags + notification strategy. Used for client list scores and admin recommendations when data is available (mock derives events from appointments).
- **Refund/cancel**: Rules in `src/lib/cancellation.ts`; refund when PAID and hours until start ≥ freeCancelHours.

---

## 5. Deployment

### 5.1 Requirements

- **Node.js**: 18+ (LTS recommended).
- **pnpm**: 8+.
- **Build (API)**: Native addon `better-sqlite3` must compile (e.g. Xcode Command Line Tools on macOS). From repo root: `pnpm build:sqlite` if you see bindings errors.

### 5.2 Environment variables

| Variable | Where | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_MODE` | Frontend | `mock` (default) or `http`. |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Backend URL when mode is `http`, e.g. `http://localhost:3001` or `https://api.example.com`. |
| `PORT` | Backend (apps/api) | API port (default `3001`). |
| `JWT_SECRET` | Backend | Secret for JWT signing. **Use a strong random value in production.** |
| `DATABASE_PATH` | Backend | SQLite file path (default `./data/pristav.db`). In production use an **absolute path** and ensure the directory exists and is writable. |

Copy `.env.example` to `.env` and set values. For production frontend, set `NEXT_PUBLIC_*` at **build time** (e.g. in CI or server env).

### 5.3 Build and run

**Development (mock, no backend):**

```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

**Development (with backend):**

```bash
pnpm install
# Optional: pnpm build:sqlite  (if better-sqlite3 bindings fail)
# Set in .env: NEXT_PUBLIC_API_MODE=http, NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
pnpm dev:all
# Next.js on 3000, API on 3001. Restart Next after changing NEXT_PUBLIC_*.
```

**Production (frontend):**

```bash
pnpm install
pnpm build
pnpm start
# Default port 3000; override with -p if needed.
```

**Production (backend):**

```bash
cd apps/api   # or from root: pnpm --filter api install && pnpm --filter api build
pnpm install
pnpm build
# Set PORT, JWT_SECRET, DATABASE_PATH (absolute path recommended).
pnpm start
# Listens on 0.0.0.0:PORT
```

- **Database**: On first run with an empty DB, the API runs migrations and seeds. Back up the SQLite file regularly (e.g. cron).
- **CORS**: Backend uses `origin: true`. For production, restrict to your frontend origin(s) in `apps/api/src/index.ts`.

### 5.4 Production checklist

- [ ] Set `JWT_SECRET` to a strong random value.
- [ ] Set `DATABASE_PATH` to an absolute path; ensure directory exists and is writable.
- [ ] Back up SQLite file regularly (and test restore).
- [ ] Build frontend with correct `NEXT_PUBLIC_API_MODE` and `NEXT_PUBLIC_API_BASE_URL`.
- [ ] Restrict CORS on the API to your frontend origin(s).
- [ ] Serve frontend over HTTPS in production.
- [ ] Ensure API is reachable from the browser (same domain or CORS and correct base URL).
- [ ] (Optional) Add medical reports, behavior scores, and client profile log to the backend if you need them in HTTP mode.

### 5.5 Railway deployment

**Dvě služby z jednoho repa:** web (Next.js) a api (Fastify). Obě mají Root Directory prázdné.

**Služba api:**

| Nastavení | Hodnota |
|-----------|---------|
| Build Command | `pnpm install && pnpm --filter api build` |
| Start Command | `pnpm --filter api start` |
| Variables | `DATABASE_PATH=/data/pristav.db`, `JWT_SECRET` (silný secret) |
| Volume | Mount path `/data`, připojit ke službě api |

**Služba web:**

| Nastavení | Hodnota |
|-----------|---------|
| Build Command | `pnpm install && pnpm run build` |
| Start Command | `pnpm run start` |
| Variables | `NEXT_PUBLIC_API_MODE=http`, `NEXT_PUBLIC_API_BASE_URL=https://TVAJE-API-URL.up.railway.app` |

**Důležité:** `NEXT_PUBLIC_*` nastavuj **jen u web služby**, ne u api. Po změně env u webu je třeba **Redeploy** (build vkládá tyto hodnoty).

**Kontrola:** Otevři URL api → `{"ok":true,"service":"api"}`. Otevři `/ping` → `{"ok":true,"ts":...}`. API health check může používat `/ping` (bez DB).

**Railway sleep (free tier):** Služby mohou usínat. Po probuzení první požadavky mohou vracet 502. Frontend má retry (3s, 5s) pro 502. Přihlašovací stránka volá `/ping` při načtení pro pre-warm. Pokud přihlášení nefunguje, zkus to znovu za 5–10 s nebo vypni sleep v nastavení služby.

---

## 6. How to use the system

### 6.1 First run

1. Clone repo, run `pnpm install`.
2. Run `pnpm dev` (mock) or set env and run `pnpm dev:all`.
3. Open http://localhost:3000 → Login. Use **role-based dev login** (choose ADMIN, RECEPTION, EMPLOYEE, or CLIENT) to enter without a password.

### 6.2 Typical workflows

- **Client**: Log in → Dashboard → Book (pick day → therapist → slot → confirm). View reservations, credits, reports, settings. Optionally enable push in settings (if admin allows prompt).
- **Reception**: Calendar and working hours → activate booking per therapist/month → create appointments or let clients book. Clients list → detail → edit billing data, credits, view health record and medical reports. Billing → generate report → create invoices → send.
- **Therapist**: Calendar (day timeline, “Teď” line) → click slot → appointment detail with client card (last visit, diagnosis, reports). Create medical report from “Lékařská zpráva”, edit health record from client links.
- **Admin**: Users (roles), services, rooms, settings (invoice, notifications, SMS, push, prompt). Clients: push toggles per client, reset password. Billing and stats as needed.

### 6.3 Verifying deployment

- **Frontend**: Open app URL → login page loads.
- **API**: `curl https://your-api/` → `{"ok":true,"service":"api"}`.
- **Database**: `curl https://your-api/health` → `{"ok":true,"database":"connected"}`.
- **Settings**: Log in as Admin → Settings. If “Režim server” is shown, frontend is using the backend.

---

## 7. Operational details

### 7.1 Database (SQLite)

- **Path**: Configured by `DATABASE_PATH`. Default `./data/pristav.db` relative to API process cwd.
- **Migrations**: Run on every API startup (`CREATE TABLE IF NOT EXISTS …`). No separate migration command.
- **Backup**: Copy the SQLite file while the API is running (SQLite supports this) or use a scheduled job. Test restore on a staging instance.

### 7.2 Logs and errors

- **API**: Fastify logger; errors return JSON `{ code, message }` and appropriate status (401, 403, 404, 409, 500).
- **Frontend**: User-facing errors often via `alert()`; consider centralizing and logging in production.

### 7.3 Known limitations

- **Backend**: Medical reports, behavior/scores, and client profile log are not implemented; use mock for those or extend the API.
- **PDF/DOCX export**: Mock returns plain text in PDF/DOCX MIME types; for real documents use a library (e.g. jspdf, docx) in backend or frontend.
- **SMS / e-mail**: Configurable (FAYN SMS, notification sender) but sending is stubbed or placeholder; integrate real providers for production.
- **Bank matching**: FIO Bank matching is a placeholder; implement when you have the API.

---

## 8. Documentation index

| Document | Description |
|----------|-------------|
| **README.md** | Quick start, env vars, backend summary, endpoints table, PWA, quality. |
| **docs/About.md** (this file) | Full overview, features, infrastructure, deployment, operations. |
| **docs/acceptance-criteria.md** | Formal criteria (G, A, C, R, E, AD, S, D, B) for testing and scope. |
| **docs/application-features.md** | Feature list by role and area; API & data notes; changelog. |
| **docs/behavior-algorithm.md** | Events, metrics, scores, tags, notification strategy. |
| **docs/billing-and-financial-management.md** | Billing, invoicing, client data, overdue, FIO placeholder. |
| **docs/ui-ux-design-proposal.md** | Design tokens, components, accessibility. |
| **backend_integration_plan.md** | Historical plan for adding the Fastify backend. |

---

*Last updated to reflect: day-timeline calendar, client card (health record, medical reports, last visit), medical reports creation and download, health record subpage, client list (behavior score + unpaid indicators), push preferences (admin-only toggles, repeated prompt, admin disable).*
