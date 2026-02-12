# Návod k nasazení — Přístav radosti

Aplikace **vyžaduje běžící backend** (API). Bez něj se zobrazí hláška „Backend neběží“. Mock režim není podporován.

---

## 1. Co potřebujete

- **Frontend:** Next.js (port 3000, nebo dle konfigurace)
- **Backend:** Fastify API v `apps/api` (port 3001), SQLite databáze
- **Proměnné prostředí:** viz níže

---

## 2. Lokální spuštění

### 2.1 Backend (API)

1. Z kořene repozitáře:
   ```bash
   pnpm install
   ```
2. (Volitelně) Pokud API hlásí chybu „Could not locate the bindings file“ (better-sqlite3):
   ```bash
   pnpm build:sqlite
   ```
3. Spusťte API:
   ```bash
   pnpm dev:api
   ```
   API běží na **http://localhost:3001**. Ověření: `curl http://localhost:3001/` → `{"ok":true,"service":"api"}`.

### 2.2 Frontend (Next.js)

1. V kořeni repozitáře vytvořte soubor `.env.local` (nebo nastavte env) s:
   ```env
   NEXT_PUBLIC_API_MODE=http
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   ```
2. Spusťte Next.js:
   ```bash
   pnpm dev
   ```
   Aplikace běží na **http://localhost:3000**.

3. Po změně `NEXT_PUBLIC_*` vždy **restartujte** Next.js (dev server).

### 2.3 Spuštění obou najednou

Z kořene projektu:
```bash
pnpm dev:all
```
(Next.js na 3000, API na 3001.)

---

## 3. Nasazení na produkci (např. Railway)

### 3.1 Backend (API) na Railway

1. V Railway vytvořte nový **service** (např. z GitHubu – složka nebo monorepo s `apps/api`).
2. **Root directory:** Nastavte na složku, kde je `package.json` API (např. `apps/api` nebo kořen, pokud build běží z kořene a startuje API). Pokud používáte monorepo z kořene, build/start musí být z kořene (viz níže).
3. **Build příkaz** (pokud běžíte z **kořene** repozitáře):
   ```bash
   pnpm install && pnpm --filter api build
   ```
   Případně pokud Railway běží z `apps/api`: `pnpm install && pnpm build`.
4. **Start příkaz** (z kořene):
   ```bash
   node apps/api/dist/index.js
   ```
   Nebo z `apps/api`: `node dist/index.js`.
5. **Proměnné prostředí** v Railway pro API:
   | Proměnná | Povinné | Popis |
   |----------|--------|-------|
   | `PORT` | ano | Railway nastaví sám (např. 3001) |
   | `JWT_SECRET` | ano | Silný secret pro JWT (vygenerujte náhodný řetězec) |
   | `DATABASE_PATH` | doporučeno | Cesta k SQLite (např. `/data/pristav.db`). Railway může mít ephemeral disk – pro trvalá data zvažte Railway Volume nebo externí úložiště. |
   | `CORS_ORIGIN` | ano (produkce) | URL frontendu, např. `https://vase-app.up.railway.app` |
   | `FAYN_SMS_PASSWORD` | pro SMS | Heslo k FAYN účtu (ověření telefonu při registraci) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | pro e-maily | Odesílání notifikací a testovacích e-mailů |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | pro push | Vygenerujte: `npx web-push generate-vapid-keys` |

6. **SQLite na Railway:** Defaultně může být soubor v pracovní složce. Pro restart-safe úložiště nastavte `DATABASE_PATH` na cestu na **Volume** (Railway Volumes), aby data přežila restart.

### 3.2 Frontend (Next.js) na Railway

1. V Railway vytvořte druhý **service** pro Next.js (nebo Vercel / jinou platformu).
2. **Root:** Kořen repozitáře (kde je `next.config.js`, `src/`).
3. **Build:** `pnpm install && pnpm build`
4. **Start:** `pnpm start` (nebo `node .next/standalone/server.js` pokud používáte standalone output).
5. **Proměnné prostředí** pro frontend:
   | Proměnná | Hodnota |
   |----------|--------|
   | `NEXT_PUBLIC_API_MODE` | **http** (povinné) |
   | `NEXT_PUBLIC_API_BASE_URL` | URL vašeho API, např. `https://vase-api.up.railway.app` |
   | `NEXT_PUBLIC_USE_API_PROXY` | **true** (doporučeno) – frontend pak volá `/api/proxy`, Next.js proxy předá požadavky na API. Tím se vyhnete CORS a přímému vystavení API URL v klientovi. |

   Při použití **proxy** (`NEXT_PUBLIC_USE_API_PROXY=true`):
   - Frontend volá relativní URL `/api/proxy/...`.
   - Na serveru Next.js musí být nastaveno **API_BACKEND_URL** (nebo **NEXT_PUBLIC_API_BASE_URL**) na reálnou URL API, aby proxy věděla, kam přeposílat požadavky. (V Next.js API route `src/app/api/proxy/[...path]/route.ts` se používá `API_BACKEND_URL ?? NEXT_PUBLIC_API_BASE_URL`.)

### 3.3 Shrnutí kroků (Railway)

1. **API service:** deploy z repa, build + start API, nastavit `JWT_SECRET`, `CORS_ORIGIN`, `DATABASE_PATH`, popř. SMTP, FAYN, VAPID.
2. **Web service:** deploy Next.js z téhož repa, build + start, nastavit `NEXT_PUBLIC_API_MODE=http`, `NEXT_PUBLIC_USE_API_PROXY=true`, `NEXT_PUBLIC_API_BASE_URL=https://vase-api.up.railway.app` a na serveru **API_BACKEND_URL** na stejnou URL (pro proxy).
3. Ověřit: otevřít URL webu → měla by se zobrazit přihlašovací stránka (ne „Backend neběží“). Přihlásit se (role nebo e-mail/heslo dle implementace).

---

## 4. Kontrola, že vše běží

- **API:** `curl https://vase-api.up.railway.app/` → `{"ok":true,"service":"api"}`.
- **Health (DB):** `curl https://vase-api.up.railway.app/health` → `{"ok":true,"database":"connected"}`.
- **Frontend:** V prohlížeči otevřít URL webu – přihlášení bez hlášky „Backend neběží“.

---

## 5. Časté problémy

- **„Backend neběží“** – Frontend nemá `NEXT_PUBLIC_API_MODE=http` nebo nebyl po změně env restartován. Zkontrolujte env a restartujte build/start.
- **CORS / 404 z frontendu na API** – Použijte proxy: `NEXT_PUBLIC_USE_API_PROXY=true` a na Next.js serveru `API_BACKEND_URL` na URL API.
- **API padá / „bindings“** – Na platformě, kde se nativní moduly (better-sqlite3) musí kompilovat, zkontrolujte, že build běží ve stejném prostředí jako runtime (např. Railway build step s `pnpm install` zkompiluje sqlite pro jejich prostředí).
- **Registrace / SMS** – Aby šly odesílat SMS kódy, musí být v API nastaveno FAYN (Admin → Nastavení → SMS) a env **FAYN_SMS_PASSWORD**.

---

Podrobnější popis funkcí a infrastruktury je v **docs/About.md**.
