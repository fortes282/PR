# Inventář funkcí – E2E testování

Kompletní seznam všech identifikovaných funkcí aplikace (frontend, backend, API, integrace).  
Použito pro pokrytí E2E testů.

---

## Backend API (apps/api)

- **Stack:** Fastify, SQLite (Drizzle), JWT auth, CORS, multipart.
- **Konfigurace:** PORT, JWT_SECRET, CORS_ORIGIN, DATABASE_PATH, SMTP_*, VAPID_*.

### Endpointy

| Oblast | Metoda | Cesta | Popis |
|--------|--------|-------|--------|
| Health | GET | /, /ping, /health | Ok, ping, DB check |
| Auth | POST | /auth/login | Login (email/password nebo role) |
| Auth | GET | /auth/me | Aktuální uživatel (Bearer) |
| Users | GET | /users | Seznam (role, search, page, limit) |
| Users | GET | /users/:id | Detail uživatele |
| Users | PUT | /users/:id | Update uživatele |
| Services | GET | /services | Seznam služeb |
| Services | GET | /services/:id | Detail služby |
| Services | POST | /services | Vytvoření služby |
| Services | PUT | /services/:id | Update služby |
| Rooms | GET/POST/PUT | /rooms, /rooms/:id | CRUD místnosti |
| Appointments | GET | /appointments | Seznam (clientId, employeeId, from, to, status) |
| Appointments | GET | /appointments/:id | Detail |
| Appointments | POST | /appointments | Vytvoření rezervace |
| Appointments | POST | /appointments/blocks | Vytvoření bloku |
| Appointments | PUT | /appointments/:id | Update |
| Appointments | POST | /appointments/:id/cancel | Zrušení (refund dle pravidel) |
| Appointments | POST | /appointments/:id/complete | Dokončení (409 pokud již dokončeno/zrušeno) |
| Availability | GET | /availability | Volné sloty (employeeId, from, to) |
| Availability | GET | /availability/bookable-days | Bookable days (from, to) |
| Booking activations | GET | /booking-activations | Seznam aktivací |
| Booking activations | PUT | /booking-activations | Nastavení aktivací |
| Credits | GET | /credits/:clientId | Účet + transakce |
| Credits | POST | /credits/:clientId/adjust | Úprava kreditů |
| Billing | POST | /billing/reports | Generování reportu (period) |
| Billing | GET | /billing/reports/:id | Detail reportu |
| Billing | GET | /billing/reports/:id/export | Export CSV |
| Billing | POST | /billing/reports/mark-invoiced | Označení jako vyfakturovano |
| Invoices | GET/POST/PUT | /invoices, /invoices/:id | CRUD faktur |
| Invoices | POST | /invoices/:id/send | Odeslání faktury |
| Invoices | POST | /invoices/send-bulk, /invoices/send-overdue-reminders | Hromadné odeslání |
| Bank transactions | GET | /bank-transactions | Seznam (from, to) |
| Bank transactions | POST | /bank-transactions/sync | Sync (FIO) |
| Bank transactions | POST | /bank-transactions/match | Párování s fakturou |
| Waitlist | GET/POST/PUT | /waitlist, /waitlist/:id | CRUD čekací list |
| Waitlist | GET | /waitlist/suggestions | Návrhy |
| Waitlist | POST | /waitlist/:id/notify | Notifikace záznamu |
| Reports | POST | /reports/upload | Upload souboru |
| Reports | GET | /reports | Seznam (clientId) |
| Reports | GET | /reports/:id/download | Stažení |
| Reports | PATCH | /reports/:id | Visibility |
| Notifications | GET | /notifications | Seznam |
| Notifications | POST | /notifications/send | Odeslání |
| Notifications | PATCH | /notifications/:id/read | Přečteno |
| Settings | GET/PUT | /settings | Nastavení |
| Settings | POST | /settings/test-email | Test e-mailu |
| Push | GET | /push-config | VAPID public key |
| Push | POST/DELETE | /push-subscriptions | Subscribe/unsubscribe |
| Push | GET | /push-subscriptions | Seznam (admin) |
| Push | POST | /push-subscriptions/test | Test push |
| Stats | GET | /stats/occupancy, /stats/cancellations, /stats/client-tags | Statistiky |

(Doplňkové endpointy podle kódu: auth/register, auth/sms/request, auth/sms/verify, client-profile-log, medical-reports, behavior/scores, admin/reset-client-password – ověřit v routes.)

---

## Databázový model (SQLite)

- users, services, rooms, appointments, creditAccounts, creditTransactions, billingReports, invoices, notifications, therapyReports, therapyReportBlobs, waitlist, settings, bookingActivations, pushSubscriptions.

---

## Frontend – obrazovky a flows

### Veřejné
- `/login` – přihlášení (role dev), odkaz na registraci
- `/register` – registrace klienta (e-mail, heslo, jméno, telefon, SMS kód)
- `/verify` – placeholder ověření

### Klient (CLIENT)
- `/client/dashboard` – přehled, nejbližší termín, kredity, CTA rezervace
- `/client/book` – rezervace: bookable days (zelená/červená/few-slots), výběr terapeuta a slotu, potvrzení v modalu
- `/client/appointments` – seznam rezervací, zrušení (s refund hláškou)
- `/client/credits` – zůstatek a historie
- `/client/reports` – terap. zprávy/dokumenty
- `/client/settings` – notif. preference (e-mail, SMS, push)
- `/client/waitlist` – pohled na záznam v čekací listu

### Recepce (RECEPTION)
- `/reception/calendar` – týden, filtr terapeut, barevné sloty, obsazenost
- `/reception/working-hours` – pracovní doba a obědy po terapeutovi, copy day
- `/reception/booking-activation` – zapnutí/vypnutí self-booking po terapeutovi a měsíci
- `/reception/appointments` – seznam, filtry (datum, klient, terapeut)
- `/reception/appointments/new` – nová jednoduchá rezervace
- `/reception/appointments/new-block` – nový blok
- `/reception/appointments/[id]` – detail rezervace, označit zaplaceno, zrušení, notifikace
- `/reception/clients` – seznam klientů
- `/reception/clients/[id]` – detail klienta (rezervace, kredity, health record, medical reports, bulk komunikace)
- `/reception/clients/[id]/health-record` – diagnóza, dítě DOB
- `/reception/billing` – reporty, faktury, export, mark invoiced
- `/reception/invoices/[id]` – editace faktury
- `/reception/waitlist` – čekací list, návrhy, notify

### Zaměstnanec (EMPLOYEE)
- `/employee/calendar` – denní timeline, „Teď“ čára
- `/employee/appointments` – seznam a detail (sign-up pro client-only)
- `/employee/appointments/[id]` – detail + karta klienta (health, medical reports)
- `/employee/colleagues` – seznam kolegů
- `/employee/clients/[id]/reports` – terap. reporty, upload, visibility
- `/employee/clients/[id]/health-record` – zdravotní záznam
- `/employee/clients/[id]/medical-reports` – lékařské zprávy
- `/employee/medical-reports/new` – nová lékařská zpráva (klient, pole, PDF/DOCX)

### Admin (ADMIN)
- `/admin/users` – uživatelé, editace, změna role (pouze admin)
- `/admin/services` – CRUD služby
- `/admin/rooms` – CRUD místnosti
- `/admin/settings` – free cancel, fakturace, SMTP, SMS FAYN, připomínky, push VAPID
- `/admin/clients` – klienti (jako recepce) + detail s push toggles, reset hesla, profil log
- `/admin/clients/[id]` – detail včetně health record, medical reports
- `/admin/billing` – fakturace (jako recepce)
- `/admin/stats` – occupancy, cancellations, client tags
- `/admin/background` – přehled algoritmů
- `/admin/background/communication` – komunikace
- `/admin/background/recommendations` – doporučení

### Sdílené
- `/notifications` – seznam notifikací, označit přečteno
- `/offline` – offline fallback

### API proxy (frontend)
- `/api/proxy/[...path]` – proxy na backend (CORS)
- `/api/proxy/__debug` – ping backendu

---

## Integrace a konfigurace

- **SMTP** – odesílání e-mailů (nastavení v Admin), test e-mail
- **SMS FAYN** – brána (dokumentace FAYN), enable/disable, API URL, username
- **Web Push** – VAPID klíče, push-subscriptions, test push
- **FIO Bank** – sync a match (placeholder v UI)
- **Feature / režim:** NEXT_PUBLIC_API_MODE (mock | http), NEXT_PUBLIC_USE_API_PROXY, NEXT_PUBLIC_API_BASE_URL

---

## Chování a pravidla

- Refund: canRefund (PAID, startAt, freeCancelHours) – jednotně v lib/cancellation
- Billing total: totalUnpaidFromAppointments – lib/billing-totals
- RBAC: can(role, action), getDefaultRoute(role), canAccessRoute(role, pathname)
- Booking: pouze dny/měsíce s aktivovanou aktivací (recepce); potvrzení v modalu před vytvořením rezervace

---

Tento inventář slouží k ověření, že E2E testy pokrývají všechny uvedené funkce a obrazovky.
