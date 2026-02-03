# Billing and Financial Management

This document describes billing, invoicing, client payment data, and bank integration (FIO Bank API). It is maintained with every change to these features.

---

## 1. Reservations and payment

### Booking with credit

- When a **client books an appointment** and has **available credit**, the reservation is **automatically paid** using that credit.
- If the remaining credit is **not sufficient**, the client can still create the reservation; it will remain **unpaid**.

### Marking as paid without credit

- **Reception** or **admin** can mark reservations as **paid without using credit** (e.g. cash, bank transfer).
- This is available for both **past (completed)** and **future** reservations.
- UI: Reservation detail (`/reception/appointments/[id]`) → button **"Označit jako zaplaceno (bez kreditu)"** for unpaid, non-cancelled appointments.

---

## 2. Billing for past periods

- Reception/admin can **create billing for any past period** (month/year).
- They see a **list of all unpaid reservations** for that period, grouped by client with totals.
- From this list, **individual invoices** are generated **per client** via a **"Generovat fakturu"** button.
- Invoices can be **edited** after creation (number, due date, amount, recipient details).  
  UI: `/reception/invoices/[id]`.

### Sending invoices

- Invoices can be sent **individually** (per invoice) or **in bulk** ("Odeslat hromadně") from the billing page (`/reception/billing`).

---

## 3. Invoice configuration (admin)

In **Admin → Nastavení** (`/admin/settings`), the **Fakturace** section allows:

- **Invoice numbering**
  - **Prefix** (e.g. `F`) and **next sequence number** (e.g. `1` → numbers like `F-000001`).
- **Due date**
  - Default **due date in days** from issue (e.g. 14 days).
- **Invoice header (issuer / billing entity)**
  - Configurable **vystavovatel** details shown on every invoice:
    - Name, street, city, zip, country, IČO, DIČ.

---

## 4. Invoice content

- **Recipient** of the invoice is the **client**. The invoice must include:
  - First name  
  - Last name  
  - Residential / billing address (street, city, zip, country)  
  - Phone number (optional but supported)

- If **required data for the invoice is missing** (first name, last name, street, city, zip), the system **warns the user** before generating invoices:
  - In the billing report table, the button shows **"Chybí údaje"** when client data is incomplete.
  - On "Generovat fakturu", an alert explains that the client must have name and full address filled in (Reception → Clients → client detail → **Údaje pro fakturaci**).

---

## 5. Client registration fields (for invoicing)

For client registration / profile, the following fields exist and are used for invoicing:

- **First name** (jméno)  
- **Last name** (příjmení)  
- **Child’s name** (jméno dítěte)  
- **Phone number**  
- **Email**  
- **Billing address / residential address** (ulice, město, PSČ, země)

These are editable in **Reception → Clients → [client] → Údaje pro fakturaci**.

---

## 6. Overdue invoices

- Invoices that are **past due** (due date &lt; today and status ≠ PAID) are **marked in red** in the invoice list (e.g. on `/reception/billing`).
- An **automatic reminder** can be sent for overdue invoices:
  - API: `api.invoices.sendOverdueReminders()` returns `{ sent: number }`.
  - In mock mode, this creates a reminder notification (e.g. email) per overdue invoice.
  - UI: Button **"Odeslat upomínky (po splatnosti)"** on the billing page.

---

## 7. Bank transactions and FIO Bank API

- Invoices must be **matchable with bank transactions** via API.
- The system is designed to **evaluate and match payments to invoices** using the **FIO Bank API** (see [FIO Bank API](https://developers.fio.cz/)).

### API surface (placeholder / contract)

- **`api.bankTransactions.list({ from, to })`**  
  Returns bank transactions in a date range.  
  Backend: populate from FIO Bank API (or local store after sync).

- **`api.bankTransactions.sync({ from, to })`**  
  Fetches latest movements from FIO Bank API and merges them into the local list.  
  Returns `{ imported: number }`.  
  In mock mode: no-op, returns `{ imported: 0 }`.

- **`api.bankTransactions.match(invoiceId, transactionId)`**  
  Links a transaction to an invoice: marks the invoice as **PAID** and stores the payment reference.  
  Backend: implement persistence and optional auto-matching (e.g. by variable symbol).

### Data model (contract)

- **BankTransaction**: id, date, amountCzk, variableSymbol, message, counterpartAccount, counterpartName, invoiceId (optional), matchedAt (optional).
- See `src/lib/contracts/bank-transactions.ts`.

### UI

- On **Recepce → Fakturace** there is a section **"Párování plateb (FIO banka)"** describing that FIO Bank API will be used to sync transactions and match them to invoices.
- Full UI for sync and matching (list of transactions, match buttons) is to be implemented when the backend integrates with the FIO Bank API.

---

## 8. Summary of key screens and APIs

| Area | Screen / API | Purpose |
|------|----------------|--------|
| Reception | `/reception/appointments/[id]` | Mark reservation as paid (without credit) |
| Reception | `/reception/clients/[id]` | Client billing data (name, address, phone, email, child’s name) |
| Reception | `/reception/billing` | Past-period report, unpaid list, generate invoice per client, list invoices, send individual/bulk, overdue reminders |
| Reception | `/reception/invoices/[id]` | Edit invoice (number, due date, amount, recipient) |
| Admin | `/admin/settings` | Invoice numbering (prefix, next number), due days, invoice issuer (header) |
| API | `invoices.list/get/create/update/send/sendBulk/sendOverdueReminders` | Full invoice lifecycle |
| API | `bankTransactions.list/sync/match` | FIO Bank integration (sync and match payments to invoices) |

---

## Change log (billing)

- **Initial**: Credit-based booking, mark as paid without credit, billing for past periods, generate/edit/send invoices, admin invoice config, client billing fields, overdue red + reminder, FIO Bank matching placeholder (contract + API surface).
