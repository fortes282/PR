**How to run:** From repo root, `pnpm install` then `pnpm dev`; open http://localhost:3000. For real API: set `NEXT_PUBLIC_API_MODE=http`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`, then `pnpm dev:all`. See [README](../README.md) for details.

---

1. General & PWA
ID	Criterion	Notes
G1	The app runs with pnpm install and pnpm dev and is reachable at http://localhost:3000.	Smoke / setup
G2	The app is a PWA: it exposes a web app manifest (name, theme color, icons).	Manifest from manifest.ts
G3	PWA icons are available at the paths referenced in the manifest (e.g. 192×192 and 512×512).	public/icons/icon-192.png, icon-512.png
G4	When offline (or when the server is unreachable), the user sees an offline fallback page (e.g. /offline) instead of a generic browser error.	Offline UX
G5	TypeScript builds without errors; pnpm lint passes; pnpm test passes (refund, booking window, billing totals, behavior).	Quality gate
2. Authentication & RBAC
ID	Criterion	Notes
A1	An unauthenticated user can open /login and sign in (e.g. email/password or dev role selection).	Login entry
A2	After successful login, the user is redirected to the default route for their role (Admin → /admin/users, Reception → /reception/calendar, Employee → /employee/calendar, Client → /client/dashboard).	Default routes from RBAC
A3	An authenticated user cannot access routes for another role (e.g. Client cannot open /admin/*, /reception/*, /employee/*; Admin cannot open /client/* as Client).	Route guard / RBAC
A4	Shared routes (e.g. /notifications) are accessible to any authenticated role.	Notifications global
A5	Session is persisted (e.g. localStorage) so that refreshing the page keeps the user logged in until logout or expiry.	Session persistence
A6	The user can log out; after logout, protected routes redirect to login.	Logout and redirect
3. Client
ID	Criterion	Notes
C1	Dashboard: The client sees the next upcoming appointment and current credit balance, and a clear way to go to booking.	Dashboard content
C2	Booking – Bookable days: The client sees only calendar days for which booking is activated (per therapist/month). Days outside activation are not offered for selection.	Activation-driven availability
C3	Booking – Day visuals: Days with at least one free slot are indicated (e.g. green); days with no slots but still in the activated range are indicated (e.g. red); days with two or fewer slots show a “few slots” indicator.	Green/red/few-slots
C4	Booking – Confirmation: Choosing a time slot opens a confirmation step; the reservation is created only after the client explicitly confirms (e.g. “Potvrdit rezervaci”). Selecting a slot alone does not create a reservation.	No booking without confirm
C5	Booking – Therapist/slot: The client sees therapist cards (name, avatar/initials, price, slots) and can select a slot and confirm to book.	Book flow
C6	My reservations: The client sees a list of their reservations with status and payment info; they can cancel where the cancellation policy allows.	List + cancel
C7	Credits: The client sees current balance and transaction history (read-only).	Credits view
C8	Reports: The client sees a list of therapy reports/documents available to them; an empty state is shown when there are none.	Reports list
C9	Settings: The client can view/change their own settings.	Client settings
C10	Waitlist: The client can view their waitlist entry if they have one.	Waitlist view
4. Reception
ID	Criterion	Notes
R1	Calendar: Week view with month navigation; filter by therapist; slots reflect working hours minus existing appointments; therapist color-coding and a daily occupancy indicator (e.g. red–green) are visible.	Calendar behavior
R2	Working hours: Reception can manage per-therapist weekly schedule (working hours, lunch, default price), including “copy day to week” and per-day edits.	Working hours CRUD
R3	Booking activation: Reception can enable/disable client self-booking per therapist and per month (upcoming months). Only months with activation (and working hours) affect which days clients can book.	Activation toggles
R4	Reservations list: List with filters (date/month-year, client name, therapist name).	Filters
R5	New single appointment: Reception can create a single appointment; therapist can be left unassigned (client-only slot).	New appointment
R6	New intensive block: Reception can create a multi-slot block (with breaks); one block id used for notifications.	New block
R7	Reservation detail: Reception can open a reservation and see its data and all notifications sent for it.	Detail + notifications
R8	Clients: Reception can list clients and open client detail (reservations, credits).	Clients list + detail
R9	Waitlist: Reception can manage waitlist entries and use suggestions (e.g. by slot/service).	Waitlist management
R10	Billing: Reception can generate billing reports (e.g. by period), view a report, export (e.g. CSV), and mark appointments as invoiced.	Billing workflow
5. Employee (Therapist)
ID	Criterion	Notes
E1	Calendar: Week view with month navigation; shows the therapist’s assigned appointments and unassigned (client-only) slots.	Employee calendar
E2	Reservations: Therapist can list appointments and open detail; for client-only appointments, the therapist can assign themselves (sign-up).	List, detail, sign-up
E3	Colleagues: Therapist can see a list of other employees.	Colleagues list
E4	Client reports: Therapist can open a client and view/upload/update visibility/download therapy reports for that client.	Reports CRUD + visibility
6. Admin
ID	Criterion	Notes
AD1	Users: Admin can list and edit users (including roles).	Users management
AD2	Services: Admin can create, read, update (and delete if supported) services (type, duration, price).	Services CRUD
AD3	Rooms: Admin can create, read, update (and delete if supported) rooms.	Rooms CRUD
AD4	Settings: Admin can read and update global settings. Settings include “free cancel hours” only; booking availability is controlled by reception via Booking Activation.	Settings (no booking window)
AD5	Stats: Admin can view occupancy, cancellations, and client-tag statistics (as provided by the app).	Stats dashboards
7. Shared / Global
ID	Criterion	Notes
S1	Notifications: Any authenticated user can open the notifications page, see the list, and mark items as read.	Notifications list + read
S2	Offline: When the app is offline (or the dev server is down), the user is shown the offline fallback page instead of a broken page.	Offline fallback
8. Data & API Integration
ID	Criterion	Notes
D1	With NEXT_PUBLIC_API_MODE=mock, the app works without a backend (deterministic seed data).	Mock mode
D2	With NEXT_PUBLIC_API_MODE=http and a valid NEXT_PUBLIC_API_BASE_URL, the app uses the real API for auth and all listed endpoints (auth, users, services, rooms, appointments, credits, billing, waitlist, reports, notifications, settings, stats).	HTTP mode
D3	Availability (client booking): availability.list(employeeId, from, to) returns only slots in months where booking is activated for that therapist; availability.bookableDays(from, to) returns day-level counts for the client calendar (green/red/few-slots).	Activation-aware availability
D4	Booking activation: Reception toggles (list/set by employee and month) correctly drive which days and slots are bookable by the client.	Activation ↔ booking
9. Behavior Algorithm (Optional / Backend)
ID	Criterion	Notes
B1	When client events (appointments, notifications, waitlist) are available, the app (or API) can derive events and call the behavior profile (e.g. computeBehaviorProfile); tags (e.g. Frequently Cancels, Excellent Attendance) and notification strategy can be used for UI or suggestions.	Behavior profile integration
B2	Refund and cancellation logic used in the app (or API) matches the documented rules (e.g. refund decision, late cancel threshold).	Refund/cancel rules
Summary
General/PWA: Run, manifest, icons, offline, lint/test (G1–G5).
Auth/RBAC: Login, role-based default route, route protection, session, logout (A1–A6).
Client: Dashboard, booking (activation, visuals, confirmation), reservations, credits, reports, settings, waitlist (C1–C10).
Reception: Calendar, working hours, booking activation, appointments (list/new/detail/block), clients, waitlist, billing (R1–R10).
Employee: Calendar, appointments + sign-up, colleagues, client reports (E1–E4).
Admin: Users, services, rooms, settings, stats (AD1–AD5).
Shared: Notifications, offline (S1–S2).
Data: Mock/HTTP modes, availability and activation behavior (D1–D4).
Behavior: Profile and refund rules (B1–B2) for when the algorithm is integrated.