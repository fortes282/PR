# Application Features

This document describes all application features by role and area. It is maintained with every change. Behavioral algorithms and README content are documented separately.

---

## Authentication & Roles

- **Login** (`/login`): Email/password or role-based dev login. Session stored in localStorage.
- **Roles**: `ADMIN`, `RECEPTION`, `EMPLOYEE` (therapist), `CLIENT`. Role switcher in dev for quick testing.
- **Verify** (`/verify`): Optional verification flow placeholder.

---

## Client

### Dashboard (`/client/dashboard`)
- Next upcoming appointment and credit balance.
- CTA to book an appointment.

### Booking (`/client/book`)
- **Bookable days only**: Clients see only calendar days for which working hours have been activated (reception controls this per therapist and month). No “booking window” setting; availability is controlled exclusively by activation.
- **Day visuals**:
  - **Green**: Days with one or more available time slots.
  - **Red**: Days that are fully booked (0 slots) but still in the activated range.
  - **Few-slots icon**: Small icon on days with two or fewer remaining slots to encourage booking.
- **Confirmation required**: Selecting a time slot opens a confirmation modal. The reservation is created only after the client explicitly confirms (e.g. “Potvrdit rezervaci”). Clicking a slot alone does not create a reservation.
- Therapist cards with name, avatar initials, price, and available time slots. One “Rezervovat” per therapist; slot buttons open the confirmation step.

### My Reservations (`/client/appointments`)
- List of client’s reservations with status and payment labels.
- Cancellation where allowed by policy.

### Credits (`/client/credits`)
- Current balance and transaction history. Read-only for client.

### Settings (`/client/settings`)
- **Granular notification preferences**: Per-channel toggles for e-mail (1st/2nd reminder, marketing), SMS (reminder, marketing). Saved via user update.
- **Push notifikace**: “Povolit push notifikace” subscribes the client to Web Push (using admin-configured VAPID key); “Zrušit push” unsubscribes.

### Reports / Documents (`/client/reports`)
- List of therapy reports/documents. Empty state when none.

### Waitlist (`/client/waitlist`)
- Client view of waitlist entry if applicable.

---

## Reception

### Calendar (`/reception/calendar`)
- Week view with month navigation.
- Therapist filter. Hourly slots derived from working hours minus existing appointments; therapist color-coding; daily occupancy indicator (red–green gradient).

### Working Hours (`/reception/working-hours`)
- Per-therapist: weekly schedule (working hours), lunch breaks, default price per session.
- “Copy day to week” and edit by day.

### Booking Activation (`/reception/booking-activation`)
- **Activate or deactivate** client self-booking per therapist and per month (upcoming months).
- Table: therapists × months with “Zapnuto” / “Vypnuto” toggles.
- Only months that are activated (and have working hours) contribute to client-visible bookable days.

### Reservations (`/reception/appointments`)
- List with filters: date (month/year), client name, therapist name.
- **New single appointment** (`/reception/appointments/new`): Create one appointment; therapist optional (client-only slot; therapist can sign up later).
- **New intensive block** (`/reception/appointments/new-block`): Multi-hour block with multiple slots (breaks allowed); one blockId for notifications.
- **Reservation detail** (`/reception/appointments/[id]`): Shows reservation and all notifications sent for it.

### Clients (`/reception/clients`)
- Client list and client detail (including reservations and credits).
- **Bulk communication**: Select clients via checkboxes (or “select all”); send **e-mail** or **SMS** to selected clients in bulk (modal: subject + message for e-mail, message for SMS).

### Waitlist (`/reception/waitlist`)
- Manage waitlist entries and suggestions.

### Billing (`/reception/billing`)
- **Full spec**: See [docs/billing-and-financial-management.md](billing-and-financial-management.md).
- Billing reports for past periods (month/year); list of unpaid reservations per client; generate invoice per client (validates client data); list invoices (overdue in red); send individually or in bulk; send overdue reminders; FIO Bank matching section (placeholder).
- **Invoice edit** (`/reception/invoices/[id]`): Edit number, due date, amount, recipient.
- **Reservation paid without credit**: On reservation detail, button to mark as paid (cash/bank).
- **Client billing data** (`/reception/clients/[id]`): First name, last name, child’s name, phone, email, billing address.

---

## Employee (Therapist)

### My Calendar (`/employee/calendar`)
- **Day timeline view**: Single-day vertical timeline (7:00–20:00) with date navigation (prev/today/next). **Real-time "Teď" (now) line** when viewing today, updated every minute. Click slot → appointment detail.

### Reservations (`/employee/appointments`)
- List and detail. **Appointment detail** includes a **client card**: client name, last visit date, diagnosis, child DOB, links to Health Record and Medical reports, and recent medical reports with PDF/DOCX download. **Sign-up**: Therapist can assign themselves to a client-only appointment.

### Medical Report (new) (`/employee/medical-reports/new`)
- Search client by name → select client → form with **prefilled** (name, address, child name, child DOB, report date) and **manual** fields (diagnosis, current condition, planned treatment, recommendations). Save stores report on client; visible in client detail for reception/admin/therapist; downloadable as PDF and DOCX.

### Health Record & Medical Reports (`/employee/clients/[id]/health-record`, `/employee/clients/[id]/medical-reports`)
- **Health record**: View/edit diagnosis and child's date of birth (same as reception).
- **Medical reports**: List of client's medical reports with PDF/DOCX download.

### Client Reports (`/employee/clients/[id]/reports`)
- View and manage uploaded therapy report files for a client; visibility to client.

### Colleagues (`/employee/colleagues`)
- List of other employees.

---

## Admin

### Users (`/admin/users`)
- List and edit users. **Only admin** may change user **role** (ADMIN, RECEPTION, EMPLOYEE, CLIENT) and **active** status; API enforces this. "Upravit roli" opens a modal. Nápověda (HelpTooltip) explains the function.

### Services (`/admin/services`)
- CRUD for services (type, duration, price).

### Rooms (`/admin/rooms`)
- CRUD for rooms.

### Settings (`/admin/settings`)
- **Free cancel hours** (general).
- **Fakturace**: Invoice number prefix and next number, default due days, **invoice issuer / header** (name, street, city, zip, country, IČO, DIČ). See [docs/billing-and-financial-management.md](billing-and-financial-management.md).
- **Oznámení – odesílatel e-mailů**: Sender e-mail address and name for all notification e-mails.
- **SMS – FAYN brána**: FAYN SMS gateway integration ([dokumentace](https://smsapi.fayn.cz/mex/api-docs/)): enable/disable, API URL, username; password is set on the backend.
- **Rezervace – načasování připomínek**: When to send 1st and 2nd reservation reminder e-mail and optional SMS (hours before appointment).
- **Push notifikace**: Web Push (VAPID) configuration: enable, VAPID public key, TTL, require interaction, icon/badge URLs. **Zobrazovat klientům výzvu k zapnutí push**: when on, client app shows a banner on every open until they enable push; admin can turn this off.

### Clients (`/admin/clients`)
- **Same as reception**: client list with search, behavioral score and unpaid indicators, bulk e-mail/SMS, link to detail. **Health Record** and **Medical reports** in detail.
- Detail (`/admin/clients/[id]`): same as reception plus **Push notifikace (nastavuje pouze admin)** — toggles for "Připomínky termínů (push)" and "Novinky a akce (push)" (client cannot change these in their settings); **Resetovat heslo a poslat e-mail** (admin only); **Profil klienta – log**.

### Billing (`/admin/billing`)
- **Same as reception**: monthly report, generate invoice per client, list invoices, send individually/bulk, overdue reminders, FIO placeholder. Admin can also open reception invoice edit (`/reception/invoices/[id]`) when needed.

### Stats (`/admin/stats`)
- Occupancy, cancellations, client tags statistics.

---

## Public (unauthenticated)

### Login (`/login`)
- Dev role-based login. Link to **Registrace klienta** (`/register`).

### Register (`/register`)
- **Client self-registration**: e-mail, password, name, optional phone. **SMS verification**: if phone is filled, user can request an SMS code (mock: code stored in memory, 5 min expiry) and then submit registration with the code. After success, client is logged in and redirected to client dashboard.

## Shared / Global

### Notifications (`/notifications`)
- In-app notifications list (and read state).

### Offline (`/offline`)
- Offline fallback page when applicable.

---

## API & Data

- **Mode**: `NEXT_PUBLIC_API_MODE=mock|http`. Default: mock.
- **Availability**:
  - `availability.list(employeeId, from, to)`: Open slots for a therapist in a range. **Only returns slots in months where booking is activated** for that therapist.
  - `availability.bookableDays(from, to)`: For client calendar; returns `{ date, availableCount }[]` for days in activated months (red/green and few-slots icon use this).
- **Booking activations**: `bookingActivations.list(fromMonth, toMonth)`, `bookingActivations.set(employeeId, monthKey, active)`. Reception toggles self-booking per therapist per month.
- **Contracts**: See `src/lib/contracts/` for appointments, availability, booking-activation, users, settings, etc. Settings schema no longer includes `bookingWindowDays`.

---

## UI/UX & design system (from docs/ui-ux-design-proposal.md)

- **Design tokens**: Semantic colors (success, warning, error), transition durations (fast/normal/slow), `prefers-reduced-motion` respected globally.
- **Buttons**: Hover brightness, focus ring, active scale, disabled fade; loading spinner state; min touch target 44×44 px.
- **Cards**: `.card` and `.card-hover` (subtle shadow lift on hover); transitions on shadow.
- **Modal**: Backdrop fade; panel scale + fade on desktop, bottom-sheet (translateY) on mobile; enter/exit transitions.
- **Client book**: Day/slot buttons with transitions, hover, active scale, focus ring; therapist cards with card-hover; confirm modal with enter animation (sheet/scale), success flash and error shake feedback, loading spinner on confirm; few-slots icon with subtle pulse (reduced-motion safe); skeleton loading for initial and slots load.
- **Calendar (reception/employee)**: Slot and empty-slot buttons with transition, hover, focus, active scale; occupancy bar with color transition.
- **Navigation**: Sidebar and bottom nav links with transition-colors and 44px touch targets; focus ring.
- **Accessibility**: Focus visible, reduced motion media query, semantic HTML and labels.

---

## Informational interface (nápověda)

- **HelpTooltip** (`@/components/ui/HelpTooltip`): U každé funkce lze zobrazit nápovědu – co funkce dělá a proč není k dispozici (pokud je tlačítko neaktivní).
- Použití: `<HelpTooltip title="..." description="..." disabledReason={optional} />` vedle tlačítka nebo nadpisu.
- Příklady: Admin Uživatelé (změna role), Recepce Fakturace (Generovat fakturu – proč chybí údaje), Recepce Klient detail (Upravit kredity). Stejný vzor doporučeno použít u všech hlavních funkcí v aplikaci.

---

## Change log (summary)

- **Medical reports & health record**: Therapists create medical reports (search client, prefilled + manual fields); reports stored and listed in client detail with PDF/DOCX download. Health Record subpage (diagnosis, child DOB) for reception, admin, employee. Client list shows behavioral score (icon + tooltip) and unpaid invoice indicator.
- **Therapist calendar**: Day timeline with real-time "Teď" line; client card on appointment detail (last visit, health record, medical reports).
- **Push**: Admin-only toggles for "Připomínky termínů (push)" and "Novinky a akce (push)" in client detail; repeated prompt to enable push (admin can disable in settings).
- **Admin role change**: Only admin can change user role and active status; enforced in API (mock and backend contract). Admin users page: "Upravit roli" modal.
- **Client self-registration**: Public `/register` with e-mail, password, name, optional phone; optional SMS verification (request code → enter code → register). Mock: auth.register, requestSmsCode, verifySmsCode.
- **Admin reset client password**: Admin client detail has "Resetovat heslo a poslat e-mail"; logs PASSWORD_RESET_REQUESTED and creates email notification (backend sends link to set new password).
- **Client profile log**: Log entries (NOTIFICATION_SENT, DATA_CHANGE, ROLE_OR_ACTIVE_CHANGED, PASSWORD_RESET_REQUESTED; EVALUATION_UPDATE reserved) on client profile; visible in reception and admin client detail. Appended on sendBulk, credits.adjust, users.update (client), resetClientPassword.
- **Admin clients and billing**: Admin has Klienti (list + detail with log and reset password) and Fakturace (same as reception). Admin can access reception routes (e.g. invoice edit).
- **HelpTooltip**: Informational tooltips for functions (what they do; why unavailable). Used on Admin Users, Reception Billing (Generovat fakturu), Reception Client detail (Upravit kredity). Pattern documented for use across the app.
- **Billing and financial management**: Full doc in [docs/billing-and-financial-management.md](billing-and-financial-management.md). Credit-based booking; mark reservation as paid without credit; billing for past periods; generate/edit/send invoices; admin invoice header and numbering; client billing fields; overdue red + reminder; FIO Bank matching placeholder.
- **UI/UX design proposal**: Implemented micro-animations, modal/confirm transitions, client book and calendar transitions, loading skeletons, success/error feedback, design tokens, and accessibility (reduced motion, focus, touch targets).
- **Booking confirmation**: Client must confirm in a modal before a reservation is created.
- **Booking activation**: Working hours for upcoming months can be activated or deactivated per therapist; this alone controls whether clients can self-book. Booking window feature removed.
- **Client calendar**: Only days with activated working hours are shown; green (slots available), red (fully booked), icon for ≤2 slots.
- **Documentation**: This file is updated with every feature change (excluding behavioral algorithms and README).
