Design principles
Calm, trustworthy — Healthcare/wellness feel; no flashy or aggressive motion.
Clarity and speed — Animations support understanding and feedback, not spectacle.
Accessibility — Respect prefers-reduced-motion, focus states, and contrast.
Consistency — One design system (tokens, components) across roles and screens.
1. Micro-animations (core UX)
Scope: Buttons, cards, time slots, focus/active, loading, success/error.
Element	Proposal	Implementation
Buttons (.btn, .btn-primary, etc.)	Light scale or brightness on hover; clear focus ring; disabled state fades.	CSS transition on transform, opacity; keep existing focus:ring-*.
Cards (.card, therapist cards, slot cards)	Subtle hover lift (e.g. shadow-sm → shadow-md) and/or border emphasis.	Tailwind transition-shadow, hover:shadow-md.
Time slots (client book, reception/employee calendar)	Hover highlight; “available” vs “booked” vs “selected” state change with short transition.	Transition on background-color / border-color; optional 50–100 ms.
Focus / active	All interactive elements keep visible focus ring; active state (e.g. slot selected) slightly stronger than hover.	Existing focus:ring-*; add active:scale-[0.98] where it helps.
Loading	Inline spinners or skeleton for lists/tables; button loading state (spinner + disabled).	Small CSS spinner or Tailwind animate-spin; skeleton with animate-pulse.
Confirmation	Success: short checkmark or green flash; error: red shake or border pulse.	CSS keyframes: success (opacity/scale), error (translateX shake); keep under ~300 ms.
Best used in:
Client booking (slot click → confirm), reception/employee calendar (slot click), any primary action (Rezervovat, Potvrdit, Uložit).
2. Transition animations (state-to-state)
Scope: Modals, expandable rows, calendar navigation, step flows.
Flow	Proposal	Implementation
Modal open/close	Backdrop fade; panel scale + fade (e.g. 0.95 → 1).	CSS transition on overlay and panel; or Framer Motion AnimatePresence + initial/animate/exit.
Expand/collapse (reservation detail, client detail, accordions)	Height + opacity; content doesn’t jump.	overflow-hidden + transition on max-height/height, or Framer Motion layout/animate.
Calendar day/month switch	Week or month content crossfade or short slide (e.g. left/right by day).	Framer Motion AnimatePresence + mode="wait" and x/opacity; or CSS only with keyframes.
Step flows (client: day → therapist → time → confirm)	Step container transition (e.g. slide or fade) when moving forward/back.	Same as calendar: AnimatePresence + x or opacity per step.
Best used in:
Modal component, reception appointment detail expand, client book steps, CalendarMonthNav (day/month change).
3. Layout animations (smart UX)
Scope: Slot list changes, day colors, “just booked” feedback.
Scenario	Proposal	Implementation
Slot becomes booked (reception/employee view)	Slot smoothly changes from “empty” to “booked” (color/opacity); list doesn’t jump.	Framer Motion layout on slot items; or transition on background/border.
Day color change (client calendar: green ↔ red as availability updates)	Color transition (e.g. 150–200 ms) instead of instant flip.	Transition on background-color / Tailwind color classes for day cells.
Reordering / add/remove (waitlist, appointments list)	List items animate in/out or reorder without layout jump.	Framer Motion layout + layoutId or list AnimatePresence for add/remove.
Real-time updates	New row or updated occupancy animates in subtly; no full-page flash.	Same as above; optional subtle “new” highlight that fades.
Best used in:
CalendarWeekView (slot states, day occupancy bar), client book calendar (green/red/few-slots), reception/employee calendar, any list that updates (appointments, waitlist).
4. State-driven animations (data-based)
Scope: Occupancy, “last slots”, behavior-driven hints.
Element	Proposal	Implementation
Daily occupancy (reception calendar)	Bar or gradient (0% → 100%) with smooth value change; already have occupancyColor(percent).	Transition on the width/color of the bar; keep red–green semantics.
“Few slots” icon (client book, ≤2 slots)	Subtle pulse or glow so it’s noticeable but not alarming.	CSS @keyframes pulse on opacity or box-shadow; respect prefers-reduced-motion: reduce (disable or shorten).
Recommended / behavior-based slots (if you add behavior UI)	Soft highlight (e.g. border or icon) for “recommended” slots; no heavy motion.	Static or very subtle emphasis; optional 1s ease-in highlight on first view.
Credits / balance	Number change (e.g. after booking or adjustment) with short count or fade.	Optional: number transition (e.g. Framer Motion or a tiny count-up); else simple opacity transition.
Best used in:
Client booking calendar (few-slots icon, green/red), reception calendar occupancy bar, future behavior-driven suggestions.
5. Calendar & time animations
Scope: Client book, reception calendar, employee calendar.
Feature	Proposal	Implementation
Hour strip scroll (reception/employee week view)	Smooth scroll when navigating many hours; optional sticky header.	Native scroll-behavior: smooth or scrollIntoView({ behavior: 'smooth' }).
Day selection (client book)	Selected day clearly highlighted (border/background) with short transition.	Transition on border/background; keep focus visible.
Skeleton for days/slots	While loading, show skeleton grid (pulse) instead of blank or spinner.	Tailwind animate-pulse on placeholder blocks matching grid layout.
Lazy load months	When switching month, show skeleton or placeholder then content with short fade.	Same as step/calendar transition; fetch then AnimatePresence + fade.
Best used in:
CalendarWeekView, CalendarMonthNav, client book (day grid + therapist slots).
6. Responsive animations (mobile-first)
Scope: Navigation, modals, gestures.
Breakpoint / context	Proposal	Implementation
Sidebar → bottom nav (client: desktop sidebar vs mobile bottom nav)	Nav change is layout-only; active state transition (underline or background) smooth.	CSS transition on active indicator; no need to animate sidebar ↔ bottom swap.
Modal on mobile	Full-width or near full-width; enter from bottom (sheet-like) on small screens.	Media query or class: desktop center scale/fade; mobile translateY(100%) → 0 with transition.
Swipe gestures (optional)	Swipe to next/prev day in calendar or to close sheet.	Touch handlers + transform or Framer Motion drag; keep tap primary.
Touch targets	Buttons and slot taps at least 44×44 px; hover effects optional on touch devices.	min-height/min-width; avoid hover-only critical feedback.
Best used in:
AppShell (sidebar vs bottom nav), Modal (and confirmation modal in book flow), calendar navigation.
7. Design (look & feel)
Scope: System, aesthetics, accessibility, tokens.
Area	Proposal	Notes
Style	Modern SaaS, healthcare/wellness: calm, clear, trustworthy. Prefer minimalist over busy.	Align with existing primary/surface and .card/.btn.
Design system	Extend current tokens: add semantic tokens (e.g. success, warning, error), spacing scale, type scale.	Keep primary, surface; add --color-success, --color-error, etc. in globals.css and Tailwind.
Components	Reusable: CalendarDay, SlotCard, TherapistCard, ConfirmModal, DataTable row. Same transitions per type.	Use existing Modal, CalendarWeekView; extract day/slot/card into small components with shared animation classes.
Light / dark	Optional dark mode via CSS variables and prefers-color-scheme or toggle; ensure contrast.	Extend :root and .dark; WCAG AA.
Accessibility	Focus visible, prefers-reduced-motion respected (disable or shorten non-essential motion), semantic HTML, labels.	@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms; } } or similar.
Typography	Clear hierarchy (headings, body, captions); comfortable reading size; line-height for lists and forms.	Tailwind font-size and leading-*; one or two families.
Occupancy / state colors	Keep 0% red → 100% green for occupancy; use same success/warning/error palette app-wide.	Align with existing occupancyColor() and therapist palette in CalendarWeekView.
8. What to avoid
Avoid	Reason
Heavy 3D (e.g. Three.js)	Unnecessary for this product; hurts performance and battery.
Long decorative animations	Distracting; users want to book and manage quickly.
“Wow” effects that delay content	Speed and clarity matter more than spectacle.
Aggressive motion (big bounces, fast spins)	Conflicts with calm, professional, healthcare tone.
Hover-only critical feedback on touch devices	Always provide tap/click feedback.
Ignoring prefers-reduced-motion	Required for accessibility.
9. Recommended approach for this project
Do: Micro-animations (buttons, slots, cards, loading, success/error).
Do: Transitions for modals, expand/collapse, calendar step and day/month change.
Do: Layout/state-driven tweaks: slot state changes, day color transitions, occupancy bar, few-slots pulse.
Do: Responsive and mobile: sheet-style modal, smooth active nav, optional swipe.
Do: One design system (tokens, components) and accessibility (focus, reduced motion).
Don’t: Heavy 3D, long illustrations, or flashy effects at the cost of speed and trust.
10. Tech stack suggestion
CSS: Transitions and keyframes for most micro-animations and simple transitions (modal, colors, focus).
Framer Motion (or Motion One): Where needed for layout (list/slot reorder, add/remove), step/calendar transitions, and AnimatePresence for enter/exit.
Tailwind: Continue using for layout and tokens; add transition-*, animate-* where applicable.
Start with CSS-only for buttons, cards, modals, and day/slot colors; add Framer Motion when you introduce multi-step flows, list reorder, or more complex enter/exit.
11. Priority by role/screen
Priority	Screen / flow	Main animations
High	Client book (day → therapist → slot → confirm)	Step transition, slot hover/selected, confirm modal open/close, success/error.
High	Reception/employee calendar	Slot hover/state, day occupancy transition, modal open/close.
High	Global	Button/card hover and focus, loading states, modal transitions.
Medium	Client calendar (green/red/few-slots)	Day color transition, few-slots pulse.
Medium	Lists (appointments, waitlist, clients)	Skeleton load, optional list add/remove.
Lower	Admin, settings, stats