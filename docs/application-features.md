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

### Reports / Documents (`/client/reports`)
- List of therapy reports/documents. Empty state when none.

### Settings (`/client/settings`)
- Client-specific settings.

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
- Week view with month navigation. Shows assigned and unassigned (client-only) appointments for the logged-in therapist.

### Reservations (`/employee/appointments`)
- List and detail. **Sign-up**: Therapist can assign themselves to a client-only appointment (employeeId set on update).

### Colleagues (`/employee/colleagues`)
- List of other employees.

### Client Reports (`/employee/clients/[id]/reports`)
- View and manage reports for a client.

---

## Admin

### Users (`/admin/users`)
- List and edit users (roles, etc.).

### Services (`/admin/services`)
- CRUD for services (type, duration, price).

### Rooms (`/admin/rooms`)
- CRUD for rooms.

### Settings (`/admin/settings`)
- **Free cancel hours** (general).
- **Fakturace**: Invoice number prefix and next number, default due days, **invoice issuer / header** (name, street, city, zip, country, IČO, DIČ). See [docs/billing-and-financial-management.md](billing-and-financial-management.md).

### Stats (`/admin/stats`)
- Occupancy, cancellations, client tags statistics.

---

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

## Change log (summary)

- **Billing and financial management**: Full doc in [docs/billing-and-financial-management.md](billing-and-financial-management.md). Credit-based booking; mark reservation as paid without credit; billing for past periods; generate/edit/send invoices; admin invoice header and numbering; client billing fields; overdue red + reminder; FIO Bank matching placeholder.
- **UI/UX design proposal**: Implemented micro-animations, modal/confirm transitions, client book and calendar transitions, loading skeletons, success/error feedback, design tokens, and accessibility (reduced motion, focus, touch targets).
- **Booking confirmation**: Client must confirm in a modal before a reservation is created.
- **Booking activation**: Working hours for upcoming months can be activated or deactivated per therapist; this alone controls whether clients can self-book. Booking window feature removed.
- **Client calendar**: Only days with activated working hours are shown; green (slots available), red (fully booked), icon for ≤2 slots.
- **Documentation**: This file is updated with every feature change (excluding behavioral algorithms and README).
