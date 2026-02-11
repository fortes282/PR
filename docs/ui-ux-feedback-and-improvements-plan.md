# Plán: Zpětná vazba (feedback) a další UI/UX vylepšení

Cíl: sjednotit zpětnou vazbu po akcích, odstranit `alert()`, doplnit vizuální a UX vylepšení.

---

## 1. Zpětná vazba o provedených akcích (priorita vysoká)

### 1.1 Současný stav

- **Toaster** (`useToast`) existuje v layoutu, ale **nikde se nevolá** – žádné toasty po akcích.
- **Chyby** se zobrazují téměř všude přes **`alert()`** – blokující, nekonzistentní, na mobilu nevhodné.
- **Úspěch** je potvrzen jen na málo místech (např. client book – flash v modalu, client settings – `justSaved` animace). Po uložení/zrušení/vytvoření jinde uživatel často nevidí „Uloženo“ / „Rezervace zrušena“.

### 1.2 Řešení: jednotný systém toasts

**Princip:** Po každé významné akci (uložit, zrušit, vytvořit, odeslat, smazat) zobrazit **neblokující toast** s jasnou zprávou.

| Akce | Success toast (česky) | Error (místo alert) |
|------|------------------------|----------------------|
| Rezervace vytvořena | „Rezervace byla vytvořena.“ | toast error |
| Rezervace zrušena | „Rezervace byla zrušena.“ | toast error |
| Nastavení uložena | „Nastavení bylo uloženo.“ | toast error |
| Faktura odeslána / vyfakturováno | „Faktura odeslána.“ / „Označeno jako vyfakturováno.“ | toast error |
| Pracovní doba uložena | „Pracovní doba byla uložena.“ | toast error |
| Aktivace rezervací uložena | „Aktivace rezervací byla uložena.“ | toast error |
| Uživatel vytvořen/upraven | „Uživatel byl uložen.“ | toast error |
| Klient / údaje uloženy | „Údaje byly uloženy.“ | toast error |
| Čekací list / notifikace | „Oznámení odesláno.“ / „Položka přidána.“ | toast error |
| Stažení souboru (PDF, CSV) | „Soubor byl stažen.“ (volitelně info toast) | toast error |
| Testovací e-mail | „Testovací e-mail byl odeslán.“ (už je inline, lze doplnit toast) | toast error |

**Implementace:**

1. **V každé stránce/souboru, kde je dnes `alert(...)`:**  
   - Přidat `const toast = useToast();`  
   - Při chybě: `toast(e instanceof Error ? e.message : "Chyba.", "error");` místo `alert(...)`  
   - Při úspěchu (po `await api.*` a před zavřením modalu / refresh):  
     `toast("Konkrétní zpráva.", "success");`

2. **Místa k úpravě (alert → toast + success toasty):**
   - `client/appointments/page.tsx` – zrušení rezervace
   - `client/settings/page.tsx` – uložení (doplnit success toast kromě justSaved)
   - `client/book/page.tsx` – po vytvoření rezervace (mimo modal lze přidat toast)
   - `reception/appointments/[id]/page.tsx` – zrušení, další akce
   - `reception/appointments/new/page.tsx` – vytvoření rezervace
   - `reception/appointments/new-block/page.tsx` – vytvoření bloku
   - `reception/working-hours/page.tsx` – uložení
   - `reception/booking-activation/page.tsx` – uložení
   - `reception/billing/page.tsx` – všechny akce (odeslání, vyfakturováno, upomínky)
   - `reception/invoices/[id]/page.tsx`
   - `reception/clients/page.tsx`, `reception/clients/[id]/page.tsx`
   - `reception/waitlist/page.tsx`
   - `admin/*` – users, clients, settings, billing
   - `employee/*` – appointments, reports, health-record, medical-reports
   - `public/login/page.tsx` – chyba přihlášení (toast místo alert)
   - `client/reports/page.tsx` – stažení

3. **Loading stavy u akcí:**  
   U tlačítek, která volají API, přidat stav `loading` (např. `saving`, `cancelling`) a během něj:  
   `disabled={loading}` a v obsahu tlačítka spinner + text „Ukládám…“ / „Ruším…“.  
   Kde už loading je, ponechat; kde chybí, doplnit (reception billing, working-hours, admin users, atd.).

---

## 2. Vylepšení Toaster komponenty (priorita střední)

- **Ikony podle typu:**  
  success → Check (zelená), error → AlertCircle nebo X (červená), info → Info (šedá/modrá).  
  Použít Lucide stejně jako v AppShell/dashboard.
- **Animace:**  
  Vstup: krátký slide zprava nebo fade-in. Odchod: fade-out (nebo slide).  
  Framer Motion už v projektu je – lze obalit položky v `AnimatePresence` + `motion.div`.
- **Vzhled 2026:**  
  `rounded-2xl`, lehký shadow, konzistentní barvy z design tokens (success/error z globals.css).  
  Tlačítko zavřít (×) vpravo, ikona vlevo, text uprostřed.
- **Pozice:**  
  Zůstat `bottom-4 right-4`; na mobilu zvážit `bottom-20` (nad spodní navigací), aby toasty nebyly pod prsty.
- **Dostupnost:**  
  Ponechat `role="alert"` a `aria-live="polite"`; u zavíracího tlačítka `aria-label="Zavřít"`.

---

## 3. Prázdné stavy (Empty states) – priorita střední

- **Problém:** Řada stránek má jen text „Žádné rezervace.“ / „Žádné faktury.“ bez ikony a bez jasné výzvy k akci.
- **Řešení:** Jedna sdílená komponenta, např. `EmptyState`, s props:  
  `icon` (Lucide), `title`, `description?`, `action?` (např. „Rezervovat termín“ + href nebo onClick).

**Použít na:**

| Stránka | Titul empty state | Popis / CTA |
|---------|--------------------|-------------|
| Client – Moje rezervace | Žádné rezervace | „Zatím nemáte žádné termíny.“ + tlačítko „Rezervovat termín“ → /client/book |
| Client – Kredity | Žádné transakce | „Historie kreditů se zobrazí po první transakci.“ |
| Client – Zprávy | Žádné zprávy | „Zatím nemáte žádné zprávy ani dokumenty.“ |
| Client – Čekací list | Žádné položky | „Nejste v čekací listě.“ + info |
| Reception/Admin – Faktury | Žádné faktury | „V tomto období nejsou faktury.“ |
| Reception – Čekací list (doporučení) | Žádná doporučení | Krátký popis |
| Notifications | Žádná oznámení | „Nemáte žádná oznámení.“ |
| Různé – lékařské zprávy | Žádné lékařské zprávy | Jednoduchý text |
| DataTable obecně | Využít `emptyMessage` + volitelně celý EmptyState layout | |

Komponenta může mít variantu „inline“ (jen text + ikona) a „card“ (větší blok s CTA).

---

## 4. Další grafická a UX vylepšení

### 4.1 Loading stavy stránek

- Kde je jen text „Načítám…“, použít **skeleton** místo jednoho řádku (např. client dashboard už má skeleton na book page; appointments, credits, reports – stejný vzor).
- Jednotný vzor: sekce nadpis + 1–2 řádky skeletonu nebo mřížka placeholderů (jako v book flow).

### 4.2 Formuláře a validace

- **Inline chyby:** Kde se volá API a chyba se zobrazí jen v alert/toast, doplnit u formuláře i **inline** zobrazení (např. pod tlačítkem nebo u pole) – zejména přihlášení, registrace, nastavení.
- **Úspěch u formuláře:** Kromě toasty krátce zvýraznit sekci (např. stávající `animate-success-flash` na kartě nastavení) nebo zobrazit „Uloženo“ u tlačítka.

### 4.3 Sekční nadpisy a ikony

- Na dalších stránkách použít **ikony u nadpisů** (jako na client dashboard a book) – např. Moje rezervace (CalendarCheck), Kredity (Wallet), Nastavení (Settings), Kalendář (Calendar).  
  Zachovat jednotný styl: `flex items-center gap-2`, ikona `h-6 w-6` nebo `h-7 w-7`, barva primary/sky.

### 4.4 Breadcrumbs

- Tam, kde je hierarchie (detail rezervace, detail klienta, detail faktury), přidat **breadcrumbs** nahoře na stránce:  
  např. „Rezervace → Detail #123“ nebo „Klienti → Jan Novák“.  
  Zlepší orientaci a návrat zpět.

### 4.5 Tlačítka primární akce

- Hlavní CTA na stránce (Rezervovat, Uložit, Odeslat) mít konzistentně s **ikonou** (CalendarPlus, Save, Send) a třídami `btn btn-primary` + případně `card-hover-lift` pokud je v kartě.

### 4.6 Potvrzení destruktivních akcí

- Všechny akce typu „Zrušit rezervaci“, „Smazat“ už používají nebo by měly používat **ConfirmDialog**.  
  Po potvrzení vždy: **toast success** („Rezervace byla zrušena.“) a zavření dialogu; při chybě **toast error** (bez alert).

---

## 5. Pořadí implementace (doporučené)

1. **Fáze 1 – Zpětná vazba**
   - Vylepšit Toaster (ikony, animace, vzhled).
   - Nahradit `alert()` za `useToast(..., "error")` ve všech souborech z výčtu výše.
   - Přidat success toasty po každé úspěšné akci na stejných místech.
   - Doplnit loading stavy u tlačítek tam, kde chybí.

2. **Fáze 2 – Empty states**
   - Vytvořit komponentu `EmptyState`.
   - Zapojit ji do DataTable (empty slot) a na stránky: appointments, credits, reports, waitlist, notifications, faktury, lékařské zprávy.

3. **Fáze 3 – Grafická konzistence**
   - Sekční nadpisy s ikonami na zbývajících stránkách.
   - Breadcrumbs na detail stránkách (appointment, client, invoice).
   - Jednotné skeleton loading tam, kde je zatím jen „Načítám…“.

4. **Fáze 4 – Formuláře a detaily**
   - Inline zobrazení chyb u přihlášení a klíčových formulářů.
   - Kontrola, že všechny destruktivní akce jdou přes ConfirmDialog a po nich jde toast.

---

## 6. Shrnutí

- **Zpětná vazba:** Jeden systém – toasty. Žádné `alert()`. Success + error toasty u všech důležitých akcí; loading na tlačítkách.
- **Toaster:** Ikony, animace, moderní vzhled, pozice na mobilu.
- **Empty states:** Sdílená komponenta s ikonou, textem a CTA.
- **Ostatní:** Sekční ikony, breadcrumbs, skeleton loading, konzistentní CTA s ikonami, inline chyby u formulářů.

Tím získáte konzistentní, srozumitelnou zpětnou vazbu a celkově čistší, „2026“ vzhled bez velkých změn v logice.
