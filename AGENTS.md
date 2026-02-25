# Pristav Radosti — Agent Instructions

## Cursor Cloud specific instructions

### Architecture overview

This is a pnpm monorepo with three workspace packages:

| Package | Location | Purpose |
|---------|----------|---------|
| Root (Next.js frontend) | `/workspace` | App Router on port 3000 |
| Backend API (Fastify) | `apps/api` | REST API on port 3001 with SQLite |
| Shared types | `packages/shared` | Zod schemas + TS types used by both |

### Running the app

- **Both services together:** `pnpm dev:all` (uses `concurrently`)
- **Frontend only:** `pnpm dev` (port 3000)
- **Backend only:** `pnpm dev:api` (port 3001)
- Frontend requires `.env.local` with `NEXT_PUBLIC_API_MODE=http` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`. Without these, the app shows "Backend neběží" (backend not running).
- Backend auto-seeds the SQLite database on first run (creates `apps/api/data/pristav.db`).

### Lint / Test / Build

Standard commands from repo root — see `package.json` scripts:
- `pnpm lint` — ESLint (Next.js config)
- `pnpm test` — Jest unit tests
- `pnpm build` — builds shared package then Next.js

### Non-obvious caveats

- The shared package (`@pristav/shared`) **must be built** (`pnpm --filter @pristav/shared build`) before the frontend `next build` works. The `pnpm build` script already chains this. For `pnpm dev:all`, the backend uses `tsx watch` which handles TS directly, but the frontend import of `@pristav/shared` needs the compiled `dist/` to exist.
- `pnpm install` may warn about ignored build scripts for `esbuild` and `unrs-resolver`. These are non-blocking; `pnpm.onlyBuiltDependencies` in root `package.json` already allows `better-sqlite3`.
- Login uses role-based demo mode: on the login page, select a role (ADMIN, RECEPTION, EMPLOYEE, CLIENT) and click "Přihlásit se (demo)". No password required in dev.
- The app UI is in Czech (cs-CZ).
- If `better-sqlite3` bindings fail, run `pnpm build:sqlite` from the repo root.
- After changing `NEXT_PUBLIC_*` env vars, you must restart the Next.js dev server.
