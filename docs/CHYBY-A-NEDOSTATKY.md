# Seznam chyb a nedostatků v aplikaci

Projití aplikace (API, frontend, obchodní pravidla, autorizace). Položky lze postupně opravovat.

---

## 1. API – obchodní pravidla a validace

### 1.1 Služby a místnosti – nefiltrují se podle `active`
- **API GET /services** vrací všechny služby včetně neaktivních (`active: false`). Při vytváření rezervace lze tedy vybrat deaktivovanou službu.
- **API GET /rooms** vrací všechny místnosti včetně neaktivních. Stejný problém.
- **Doporučení:** Buď v API filtrovat `active !== false` u listů (nebo přidat query parametr `?activeOnly=true`), nebo při **POST /appointments** a **POST /appointments/blocks** kontrolovat, že `service.active` a `room.active` jsou true, jinak 400.

### 1.2 Přiřazení neaktivního terapeuta k rezervaci
- **POST /appointments** a **POST /appointments/blocks** nekontrolují, zda je `employeeId` (pokud je vyplněn) aktivní uživatel (`user.active !== false`). Recepce může vytvořit rezervaci na deaktivovaného terapeuta.
- **Doporučení:** Při vytváření rezervace ověřit: pokud je `employeeId` uveden, uživatel musí existovat, mít roli EMPLOYEE a `active !== false`; jinak 400.

### 1.3 Kolize termínů (místnost / terapeut)
- **POST /appointments** nekontroluje překryv s existujícími rezervacemi ve stejné místnosti nebo u stejného terapeuta. Lze vytvořit dvě rezervace ve stejný čas ve stejné místnosti.
- **Doporučení:** Před uložením ověřit, že v rozsahu `startAt–endAt` neexistuje jiná ne-zrušená rezervace se stejným `roomId` nebo (pokud je vyplněn) se stejným `employeeId`. Při kolizi vracet 409 nebo 400 s jasnou hláškou.

### 1.4 Validace času rezervace
- **POST /appointments** a **POST /appointments/blocks** nekontrolují, že `endAt > startAt`. Lze odeslat tělo s koncem před začátkem (Zod `.datetime()` to nezakazuje).
- **Doporučení:** Ve schématu nebo v handleru přidat refinements: `endAt` musí být po `startAt`; u bloku že sloty nepřekrývají a jsou seřazené.

---

## 2. API – autorizace (RBAC)

**Kritické:** Na backendu se u většiny endpointů kontroluje jen to, že je uživatel přihlášen (`authMiddleware`). **Role se nekontroluje** – tedy např. klient (CLIENT) s platným tokenem může volat endpointy určené pro recepci nebo admina.

### 2.1 Endpointy bez kontroly role (příklady)
- **GET /users** – kdokoli může načíst seznam všech uživatelů včetně e-mailů a rolí.
- **GET/PUT /appointments**, **POST /appointments**, **PUT /appointments/:id**, **POST /appointments/:id/cancel**, **POST /appointments/:id/complete** – kdokoli může číst, vytvářet, měnit a zrušovat libovolné rezervace.
- **GET/POST /credits/:clientId**, **POST /credits/:clientId/adjust** – kdokoli může číst a měnit kredity libovolného klienta.
- **GET /reports**, **POST /reports/upload**, **GET /reports/:id/download**, **PATCH /reports/:id** – kdokoli může nahrát a stahovat zprávy k libovolnému klientovi a měnit jejich viditelnost.
- **GET/POST /invoices**, **GET/PUT /invoices/:id**, **POST /invoices/:id/send**, **POST /invoices/send-bulk**, **POST /invoices/send-overdue-reminders** – kdokoli může číst, vytvářet a odesílat faktury.
- **GET/PUT /settings** – kdokoli může číst a **měnit globální nastavení** (jen test-email a push test jsou omezené na ADMIN).
- **POST /billing/reports**, **GET /billing/reports/:id**, **GET /billing/reports/:id/export** – kdokoli může generovat a stahovat billing reporty.
- **GET /services**, **GET /rooms** – méně citlivé, ale konzistentně by měly být přístupné dle role.

### 2.2 Kde se role už kontroluje
- **POST /users/invite** – pouze ADMIN (403 jinak).
- **POST /settings/test-email** – pouze ADMIN.
- **POST /push-subscriptions/test** – pouze ADMIN.
- **Admin:** reset behavior score, slot-offer-approvals – ADMIN nebo RECEPTION dle endpointu.
- **Waitlist:** CLIENT vidí jen své záznamy; ADMIN/RECEPTION vidí vše.
- **Notifications:** filtrování podle role (kdo vidí jaké notifikace).

### 2.3 Doporučení
- Zavést pomocnou funkci např. `requireRole(request, ['ADMIN', 'RECEPTION'])` a u každého endpointu explicitně požadovat přípustné role.
- Omezit přístup k citlivým datům: např. CLIENT jen vlastní rezervace, kredity, faktury (pokud je má mít), vlastní notifikace; EMPLOYEE jen to, co má podle RBAC; RECEPTION/ADMIN dle pravidel.

---

## 3. Frontend – konzistence s API

### 3.1 Reception – Nová rezervace (terapeuti a služby/místnosti)
- **Nová rezervace** načítá `api.users.list({ role: "EMPLOYEE" })` bez filtru na aktivní. V dropdownu se zobrazují i deaktivovaní terapeuti.
- **Doporučení:** Filtrovat na frontendu `e.users.filter(u => u.active !== false)` nebo mít v API endpoint, který vrací jen aktivní terapeuty pro výběr.
- Stejně tak **api.services.list()** a **api.rooms.list()** vrací vše; v UI by měly být v nabídce jen aktivní služby a místnosti (nebo API je bude filtrovat – viz 1.1).

### 3.2 Klient – Rezervace termínu (terapeuti)
- **client/book** načítá `api.users.list({ role: "EMPLOYEE" })` a zobrazuje všechny terapeuty. Dostupnost slotů už bere jen aktivní (API bookable-days je opravené), ale seznam jmen terapeutů může obsahovat neaktivní.
- **Doporučení:** Zobrazovat jen terapeuty, kteří se reálně vyskytují v dostupných slotech (nebo filtrovat `active !== false`).

### 3.3 Validace času na formulářích
- **Recepce – Nová rezervace:** Formulář nekontroluje, že konec termínu je po začátku (`endAt > startAt`). Uživatel může odeslat např. začátek 10:00 a konec 09:00.
- **Doporučení:** Před odesláním zkontrolovat `new Date(endAt) > new Date(startAt)` a zobrazit chybu; případně nabízet konec podle zvolené služby (durationMinutes).

### 3.4 Globální reakce na 401 (vypršený token)
- Po vypršení JWT uživatel u dalšího volání API dostane chybu „Unauthorized“; v aplikaci (src) není globální intercept, který by při 401 vyčistil session a přesměroval na `/login`. Uživatel tak může zůstat na stránce s toasty s chybou.
- **Doporučení:** V HTTP klientovi nebo v jednom centrálním místě při 401 volat `clearSession()` a `router.replace("/login")` (např. po zobrazení toastu), nebo použít response interceptor.

---

## 4. Chyby při načítání dat (frontend)

### 4.1 Chybějící obsluha chyb u Promise
- Na mnoha stránkách se používá `Promise.all([...]).then(...).finally(() => setLoading(false))` **bez `.catch()`**. Při selhání API zůstane prázdná stránka nebo stará data, uživatel nevidí hlášku.
- **Postižené stránky (příklady):** reception/appointments/new, reception/booking-activation, reception/appointments/page, client/book, client/dashboard, admin/users, admin/clients, reception/clients, employee/calendar, employee/appointments, admin/rooms, admin/services, client/appointments, client/reports, notifications atd.
- **Doporučení:** Přidat `.catch((err) => { setError(...); toast(...); })` a zobrazit např. „Načtení se nezdařilo“ a tlačítko „Zkusit znovu“.

---

## 5. UX a přístupnost

### 5.1 Loading bez skeletonu
- Některé stránky zobrazují jen text „Načítám…“. Lepší je jednotný skeleton (např. komponenta, která se už v projektu vyskytuje) pro konzistentní UX.
- **Doporučení:** Kde je to jen „Načítám…“, použít společný PageSkeleton nebo krátký skeleton seznamu/karty.

### 5.2 Prázdné stavy
- Ověřit, že u všech seznamů (rezervace, klienti, služby, místnosti, notifikace, čekací list atd.) existuje srozumitelný prázdný stav („Zatím žádné rezervace“ + případná akce), ne jen prázdná tabulka.

### 5.3 Tlačítka a odkazy – aria-label
- U ikonových nebo nejasných tlačítek zkontrolovat `aria-label` (hlavně u akcí „Detail“, „Upravit“, „Smazat“, „Odeslat“). Částečně už v projektu řešeno, projít konzistentně.

### 5.4 Flash chráněného obsahu před přesměrováním
- Layouty (client, reception, admin, employee) kontrolují session v `useEffect` a teprve pak přesměrují na login. Do té doby se vykreslí chráněný obsah (např. AppShell a stránka). Uživatel tak může krátce vidět obsah, než dojde k redirectu.
- **Doporučení:** Do doby ověření session nezobrazovat děti layoutu (např. loading/skeleton nebo null), nebo kontrolovat session synchronně tam, kde je to možné.

---

## 6. Bezpečnost a robustnost

### 6.1 Změna hesla – mustChangePassword
- Po prvním přihlášení s jednorázovým heslem by uživatel měl být přesměrován na změnu hesla a po ní by `mustChangePassword` měl být false. Ověřit, že backend při změně hesla tuto vlajku opravdu ukládá a že frontend po změně už neposílá na change-password.

### 6.2 Validace vstupů na backendu
- Délky řetězců (jméno, e-mail, texty) – pokud jsou v shared schématech limity, API je musí vynucovat. Ověřit, že žádný endpoint neukládá nekontrolovaně dlouhé texty (DoS, zobrazení).

### 6.3 Typování – vyhnout se `any`
- V `apps/web/src/app/login/page.tsx` je `catch (err: any)` – lépe `catch (err: unknown)` a následné narrowování, nebo jen `catch (err)` a `err instanceof Error`.

---

## 7. Menší / technické

### 7.1 Duplicitní / překrývající se sloty v bloku rezervací
- **Nový intenzivní blok:** Ověřit, že se kontroluje nejen `endAt > startAt` u každého slotu, ale že se sloty v rámci bloku **nepřekrývají** a že jsou seřazené. API **POST /appointments/blocks** to nekontroluje.

### 7.2 Číslování faktur
- Při souběžných požadavcích může dojít k duplicitnímu číslu. Pokud je to kritické, v API použít transakci nebo lock při generování dalšího čísla.

### 7.3 API proxy – 404 fallback
- V `src/app/api/proxy/[...path]/route.ts` jsou pro některé cesty (behavior/scores, client-profile-log, medical-reports) vrácena prázdná data při 404. Ověřit, že to odpovídá očekávání klienta a že chybějící funkce jsou buď doimplementované, nebo v UI ošetřené.

### 7.4 Délka rezervace vs. služba
- API nekontroluje, že rozdíl `endAt - startAt` odpovídá (nebo je rozumný vůči) `service.durationMinutes`. Volitelné vylepšení pro konzistenci.

---

## 8. Bezpečnost – konfigurace a prostředí

### 8.1 Výchozí JWT_SECRET v produkci
- V `apps/api/src/middleware/auth.ts` se používá `process.env.JWT_SECRET ?? "dev-secret-change-in-production"`. Pokud v produkci není `JWT_SECRET` nastaven, zůstane výchozí hodnota – tokeny lze pak podvrhnout.
- **Doporučení:** V produkci vynutit platný `JWT_SECRET` (např. při startu serveru zkontrolovat a ukončit, pokud chybí nebo je výchozí).

### 8.2 CORS bez omezení
- V `apps/api/src/index.ts` při nevyplněném `CORS_ORIGIN` platí `origin: true`, tedy povolí **libovolný origin**. V produkci by měl být `CORS_ORIGIN` explicitně nastaven na URL frontendu.
- **Doporučení:** V produkci vždy nastavit `CORS_ORIGIN`; pokud chybí, nepoužívat `true`, ale např. prázdný origin nebo fail-fast.

### 8.3 Žádné rate limiting
- Endpointy nemají rate limiting. U `/auth/login`, `/auth/register`, `/auth/request-sms-code` atd. lze opakovat žádosti bez omezení → brute-force, zneužití SMS.
- **Doporučení:** Přidat rate limiting (např. `@fastify/rate-limit`) pro login, registraci a odesílání SMS kódů.

### 8.4 Session v localStorage
- Access token a session jsou uloženy v `localStorage`. Při XSS může útočník token získat.
- **Doporučení:** Preferovat httpOnly cookies pro token; v kombinaci s CSRF ochranou. Pokud zůstane localStorage, minimalizovat XSS riziko (CSP, sanitizace).

### 8.5 Lokální uložení nastavení (admin)
- Na stránce admin/settings se SMS konfigurace a Push konfigurace ukládají do `localStorage` (`pristav_sms_config`, `pristav_push_config`) jako mezistav před odesláním na server. Konfigurace může zůstat jen lokálně, pokud admin stránku zavře před „Uložit vše“.
- **Doporučení:** Zvážit, zda je to záměr (konceptuální „draft“), nebo odstranit localStorage a brát data jen ze serveru.

---

## 9. API – robustnost a DoS

### 9.1 Rozsah dat u availability
- **GET /availability** a **GET /availability/bookable-days** berou `from` a `to` z query. Pokud je rozsah velmi velký (např. roky), smyčka `while (d <= toDate)` iteruje mnoho dní a může zatížit server.
- **Doporučení:** Omezit maximální rozsah (např. max 3–6 měsíců) a vracet 400 při překročení.

### 9.2 Neplatné datum u availability
- `new Date(from)` a `new Date(to)` bez validace. Při neplatném formátu (`Invalid Date`) může být porovnání `d <= toDate` chybné a smyčka se může chovat neočekávaně nebo velmi dlouho běžet.
- **Doporučení:** Validovat `from`/`to` (např. ISO string, rozsah), při neplatném vstupu vracet 400.

### 9.3 parseTimeHHmm bez validace
- V `apps/api/src/lib/date.ts` funkce `parseTimeHHmm(s)` dělá `s.split(":").map(Number)`. Pro neplatný vstup (např. `"abc:xy"`) vyjde `NaN`. Při použití v availability (`setHours(d, h)` s `h = NaN`) může dojít k neočekávanému chování.
- **Doporučení:** Validovat formát HH:mm a rozsahy; při chybě vracet bezpečné výchozí hodnoty nebo selhat srozumitelně.

---

## 10. Frontend – React a přístupnost

### 10.1 Modal bez focus trap
- Komponenta `Modal` nemá focus trap – při otevření lze Tabem přesunout focus mimo dialog. Podle WCAG by měl focus zůstat uvnitř dialogu do zavření.
- **Doporučení:** Použít `useEffect` + `querySelectorAll` pro focusovatelné elementy a obíhat je klávesou Tab, nebo knihovnu jako `focus-trap-react`.

### 10.2 React key u slotů v Nový blok
- V `reception/appointments/new-block/page.tsx` se u slotů používá `key={index}`. Při přidávání/mazání/s přeuspořádání slotů může index jako key způsobit chybné mapování stavu na DOM.
- **Doporučení:** Použít stabilní identifikátor (např. `slot.startAt + slot.endAt` nebo vygenerované `id`) místo indexu.

### 10.3 Aktualizace stavu po unmount
- HTTP klient nepoužívá `AbortController`. Při rychlé navigaci (např. odchod ze stránky před dokončením fetch) může `setState` proběhnout po odmountování komponenty → React varování „Can't perform a React state update on an unmounted component“.
- **Doporučení:** Při `fetch` předávat `signal` z `AbortController`; v `useEffect` volat `abort()` v cleanup. Před `setState` kontrolovat `isMounted` nebo používat např. `AbortController` + ignorovat chybu `AbortError` při aktualizaci stavu.

### 10.4 Duplicitní stránky health-record
- Stránky `admin/clients/[id]/health-record`, `reception/clients/[id]/health-record` a `employee/clients/[id]/health-record` jsou téměř identické (3 kopie).
- **Doporučení:** Vytvořit sdílenou komponentu `ClientHealthRecord` a ji použít ve všech třech route groupách.

---

## 11. Billing, faktury, kredity – logické chyby

### 11.1 Billing report: porovnání datumů jako řetězců
- V `apps/api/src/routes/billing.ts` se filtruje `a.startAt >= from && a.startAt <= to`, kde `from` a `to` jsou výsledkem `new Date(year, month, …).toISOString()`. ISO řetězcové porovnání funguje, ale pro měsíc závisí na UTC přepočtu — lokální půlnoc a UTC půlnoc se mohou lišit, a termín na hraně měsíce může vypadnout nebo přebývat.
- **Doporučení:** Buď porovnávat jako `Date` s `getTime()`, nebo normalizovat na UTC.

### 11.2 Hromadné odeslání faktur – odesílá i již odeslané
- `handleSendBulk` odesílá faktury se statusem `"DRAFT"` i `"SENT"`. Odeslat znovu `SENT` fakturu je zbytečné (duplicitní odeslání).
- **Doporučení:** Filtrovat jen `"DRAFT"` (nebo se zeptat, zda chce přeposlat).

### 11.3 Duplicitní stránka billing (admin vs. reception)
- `src/app/(admin)/admin/billing/page.tsx` a `src/app/(reception)/reception/billing/page.tsx` jsou téměř shodné (300+ řádků). Admin verze navíc odkazuje na `/reception/invoices/:id` (špatná route pro admin).
- **Doporučení:** Extrahovat sdílenou billing komponentu; v admin verzi opravit odkaz na `/admin/invoices/:id` (pokud existuje) nebo sdílet správný path.

### 11.4 Neuvolnitelné kredity a záporný zůstatek
- `POST /credits/:clientId/adjust` umožňuje libovolný záporný `amountCzk` bez kontroly aktuálního zůstatku. Kreditový účet může jít pod nulu.
- **Doporučení:** Zvážit kontrolu `balanceCzk + amountCzk >= 0` při odečtu, nebo alespoň varování na UI.

### 11.5 Faktura – POST /invoices neověřuje status termínů
- Při vytváření faktury se termíny berou z `appointmentIds`, ale API nekontroluje, zda jsou skutečně `UNPAID` a `!CANCELLED`. Lze vytvořit fakturu i za zrušené termíny.
- **Doporučení:** Filtrovat/ověřit, že appointments mají odpovídající status.

---

## 12. Working hours, booking activation, kalendář

### 12.1 Pracovní doba – validace start < end
- Na stránce pracovních hodin (reception/working-hours) ani na API se nekontroluje, že `start < end` u slotů a obědových pauz. Uživatel může uložit start 17:00 / end 08:00.
- **Doporučení:** Validovat na frontendu i v API (viz 22 v sekci Zod schémat).

### 12.2 Booking activation – zobrazení neaktivních terapeutů
- Stránka booking-activation načítá `api.users.list({ role: "EMPLOYEE" })` a zobrazuje všechny včetně neaktivních. Aktivace rezervací pro deaktivovaného terapeuta nemá smysl.
- **Doporučení:** Filtrovat `active !== false`.

### 12.3 Kalendář recepce – chybí obsluha .catch()
- První `useEffect` načítá appointments + users bez `.catch()`. Chyba API nechá prázdný stav bez hlášky.

### 12.4 Uložení pracovní doby – sekvenční PUT pro každého terapeuta
- `handleSave` volá `api.users.update(t.id, ...)` pro každého terapeuta **sekvenčně** (`for … await`). Při mnoha terapeutech je to pomalé.
- **Doporučení:** Použít `Promise.all` nebo batch endpoint.

---

## 13. Notifikace, SMS, registrace

### 13.1 SMS kód – Math.random() pro bezpečnostní kód
- V `apps/api/src/routes/auth.ts` se SMS ověřovací kód generuje `Math.floor(Math.random() * 10)`. `Math.random()` není kryptograficky bezpečný.
- **Doporučení:** Použít `crypto.randomInt(0, 10)` nebo `crypto.getRandomValues`.

### 13.2 SMS verifikace – chybí rate limit
- Endpoint `POST /auth/sms/request` nemá rate limiting. Útočník může opakovaně odesílat SMS kódy (finanční náklad + potenciální spam).
- **Doporučení:** Omezit na max. 3–5 požadavků na telefon za 15 min (viz také 8.3).

### 13.3 Notification: POST /notifications/send – chybí userId
- V `POST /notifications/send` se vytváří notifikace **bez `userId`**. Pole `userId` chybí v persistovaném objektu – notifikace tak nepatří žádnému uživateli a nebude zobrazena v GET /notifications pro nikoho (nebo pro všechny ADMIN/RECEPTION).
- **Doporučení:** Vyžadovat `userId` v body a uložit ho.

### 13.4 Registrace – e-mail bez case normalizace
- V `POST /auth/register` se e-mail neupravuje na lowercase. Stejný e-mail s různým casem by vytvořil duplicitní účty.
- **Doporučení:** Normalizovat `body.email.trim().toLowerCase()` (tak jak to dělá invite).

### 13.5 Notifikace – PATCH /notifications/:id/read bez ověření vlastnictví
- Kdokoli může označit libovolnou notifikaci jako přečtenou (nepodmíněno na `request.user.userId === n.userId`).

---

## 14. Client stránky – drobné problémy

### 14.1 Dashboard – `to: ""` v appointments.list
- `api.appointments.list({ clientId, from: new Date().toISOString(), to: "" })` posílá prázdný řetězec jako `to`. API filtruje `if (to) list = list.filter(a => a.endAt <= to)`, takže prázdný `to` se ignoruje – vrátí se vše od `from` (žádoucí). Ale je to implicitní chování, lepší explicitně nepředávat `to`.

### 14.2 Client settings – loadUser bez .catch()
- `api.users.get(session.userId).then(...)` bez `.catch()` – pokud API selže, uživatel vidí „Přihlaste se pro správu preferencí" místo chybové hlášky.

### 14.3 Client appointments – `load()` bez explicitní `mounted` ochrana
- Na rozdíl od dashboardu zde chybí `mounted` flag pro fetch cleanup.

---

## 15. Zod schémata – chybějící omezení (výběr nejdůležitějších)

### 15.1 Chybějící endAt > startAt validace
- `AppointmentCreateSchema`, `TherapyBlockSlotSchema`, `WorkingHoursSlotSchema`, `LunchBreakSchema` nemají `.refine()` pro ověření, že konec je po začátku.

### 15.2 Stringy bez min/max
- Téměř všechna stringová pole (`message`, `name`, `notes`, `reason`, `title`, `fileName`, `cancelReason` atd.) nemají `.min()` nebo `.max()`. Útočník by mohl poslat megabajty textu.
- **Doporučení:** Přidat alespoň `.max(5000)` na textová pole a `.max(255)` na krátká pole (jména, e-maily).

### 15.3 Čísla bez hranic
- `invoiceNumberNext`, `freeCancelHours`, `invoiceDueDays`, `balanceCzk`, `amountCzk`, stat counters – nemají rozumné min/max.
- **Doporučení:** Přidat `.min(0)` kde je to logické, `.max()` pro konfigurační hodnoty.

### 15.4 Čas (HH:mm) jako volný string
- `WorkingHoursSlotSchema.start/end`, `LunchBreakSchema.start/end` – jen `z.string()` bez `.regex(/^\d{2}:\d{2}$/)`.
- **Doporučení:** Přidat regex validaci.

### 15.5 Enum místo string
- `NotificationListParamsSchema.purpose` a `InvoiceListParamsSchema.status` – jsou `z.string()` místo příslušného z.enum().

---

## 16. CSS a UI

### 16.1 Chybějící dark mode
- V celé aplikaci se nepoužívají `dark:` prefixy. Uživatelé se tmavým režimem OS vidí vše v light mode.
- **Doporučení:** Pokud má aplikace dark mode podporovat, přidat `darkMode: "class"` do Tailwind configu a doplnit `dark:` varianty. Jinak to ponechat jako záměrné (low priority).

### 16.2 z-index konflikty
- `Modal`, `Toaster` i `HelpTooltip` používají `z-50`. Pokud se tooltip zobrazí uvnitř modalu, obě vrstvy mají stejný z-index → nepředvídatelné pořadí.
- **Doporučení:** Toast by měl být `z-[60]` nebo vyšší; HelpTooltip v modalu potřebuje `z-[51]`.

---

## 18. Akceptační kritéria – nesplněné a částečně splněné body

### G3 – PWA ikony chybějí
- **Kritérium:** PWA icons are available at the paths referenced in the manifest (icon-192.png and icon-512.png).
- **Stav: NESPLNĚNO.** Manifest v `src/app/manifest.ts` odkazuje na `/icons/icon-192.png` a `/icons/icon-512.png`, ale tyto soubory **neexistují** v `public/icons/`.
- **Doporučení:** Vytvořit/přidat ikony v daných rozměrech do `public/icons/`.

### AD2 – Services CRUD – chybí UI pro vytváření/editaci/mazání
- **Kritérium:** Admin can create, read, update (and delete if supported) services.
- **Stav: ČÁSTEČNĚ.** Stránka `admin/services` zobrazuje pouze DataTable (read-only). API endpointy `POST /services`, `PUT /services/:id` existují, ale **UI nemá formulář pro vytvoření nebo editaci služby**. Není žádný „Přidat službu" nebo „Upravit" button.
- **Doporučení:** Přidat formulář/modal pro vytvoření a editaci služby.

### AD3 – Rooms CRUD – chybí UI pro vytváření/editaci/mazání
- **Kritérium:** Admin can create, read, update (and delete if supported) rooms.
- **Stav: ČÁSTEČNĚ.** Stejný problém jako AD2 – stránka `admin/rooms` je jen read-only DataTable. API je hotové, ale UI pro CRUD chybí.
- **Doporučení:** Přidat formulář/modal pro vytvoření a editaci místnosti.

### A3 – RBAC na backendu neexistuje
- **Kritérium:** An authenticated user cannot access routes for another role.
- **Stav: ČÁSTEČNĚ.** Frontend layouty chrání cesty podle role. Ale **backend API RBAC nevynucuje** (viz sekce 2) – přihlášený CLIENT může přes API volat jakýkoli endpoint.
- **Doporučení:** Viz sekce 2 (kritická priorita).

### R7 – Reservation detail: notifikace
- **Kritérium:** Reception can open a reservation and see its data and all notifications sent for it.
- **Stav: SPLNĚNO.** Stránka `reception/appointments/[id]` zobrazuje detail i notifikace k termínu (a bloku).

### C4 – Booking confirmation
- **Kritérium:** Choosing a time slot opens a confirmation step; reservation created only after explicit confirm.
- **Stav: SPLNĚNO.** Existuje `pendingBooking` → confirmation modal s tlačítkem „Potvrdit rezervaci".

### 11.3 / Admin billing: odkaz na úpravu faktury vede na reception
- **Kritérium (z application-features.md):** Admin billing stránka.
- **Stav: CHYBA.** V `admin/billing` je odkaz `<Link href="/reception/invoices/${inv.id}">`. Admin uživatel tím přejde na `/reception/invoices/:id`, ale admin layout povoluje jen `/admin/*` cesty → redirect zpět. Admin nemá vlastní invoice edit stránku.
- **Doporučení:** Buď přidat `/admin/invoices/[id]` route, nebo výjimku v admin layoutu pro invoice edit.

### C10 / R9 – Waitlist (klient / recepce)
- **Stav: SPLNĚNO.** Obě stránky existují a fungují.

### S1 – Notifications
- **Kritérium:** Any authenticated user can open notifications and mark as read.
- **Stav: ČÁSTEČNĚ.** Stránka `notifications` existuje, ale na backendu `PATCH /notifications/:id/read` **nekontroluje vlastnictví** (viz 13.5) – kdokoli může označit libovolnou notifikaci.

### D1 – Mock mode
- **Kritérium:** With API_MODE=mock, app works without backend.
- **Stav: ZÁVISÍ.** Mock klient existuje, ale `BackendGuard` blokuje aplikaci, pokud `NEXT_PUBLIC_API_MODE !== "http"`. Tzn. bez backendu se zobrazí „Backend neběží".
- **Doporučení:** Ověřit, že mock mode je přístupný bez backendu (nebo ho explicitně odstranit a zmínit v docs).

### G5 – Quality gate: `pnpm lint`, `pnpm test`
- **Kritérium:** TypeScript builds without errors; pnpm lint passes; pnpm test passes.
- **Stav: NEOVĚŘENO v tomto auditu.** Skripty existují (`lint`, `test`, `build`). Doporučení: spustit a ověřit.

---

## 19. Akceptační kritéria – další zjištění

### Chybějící robots.txt a sitemap
- V `public/` chybí `robots.txt` a není generovaný `sitemap.xml`. Pro SEO (pokud je aplikace veřejná) nebo pro zabránění indexaci (pokud ne) by měl být alespoň `robots.txt`.

### Fakturace: admin nemá vlastní invoice-edit route
- Admin billing stránka odkazuje na `reception/invoices/[id]`, ale admin nemůže přistoupit na `/reception/*` (layout ho přesměruje, protože `canAccessRoute('ADMIN', '/reception/...')` je sice `true`, ale admin layout přesměrovává na `/admin/users`).
- **Řešení:** Admin layout **povoluje** reception routes (z `canAccessRoute`), ale admin layout se **neaplikuje** na `/reception/*` – ta má svůj vlastní reception layout. Problém: admin klikne na link → otevře se reception layout, který pustí ADMIN (protože `session.role !== "RECEPTION" && session.role !== "ADMIN"` → obě role povolené). Takže to **pravděpodobně funguje** z hlediska přístupu, ale je to matoucí navigačně (jiný sidebar, jiná navigace).
- **Doporučení:** Přidat `/admin/invoices/[id]` nebo sdílet komponentu.

### Dev login: přihlášení podle role bez hesla
- `POST /auth/login` přijímá `{ role: "ADMIN" }` a přihlásí prvního uživatele s danou rolí **bez ověření hesla** (pokud nemá nastavený hash). Pokud je tato funkce určena jen pro vývoj, měla by být v produkci **zakázána**.
- **Doporučení:** Podmínit dev login na `NODE_ENV !== "production"` nebo na příznak `ENABLE_DEV_LOGIN`.

### Registrace – chybí email unikátnost (case-insensitive)
- `POST /auth/register` hledá existujícího uživatele přes `u.email === body.email`, ale **nevolá `.toLowerCase()`**. Tedy `Admin@foo.cz` a `admin@foo.cz` jsou dva různí uživatelé.
- Invite (`POST /users/invite`) toto řeší správně (`normalizedEmail = email.trim().toLowerCase()`).

### Klient: chybějící viditelnost reportů
- **Kritérium C8:** Client sees list of therapy reports available to them.
- Stránka `client/reports` existuje, ale na backendu `GET /reports?clientId=X` vrací **všechny** reporty klienta, včetně těch kde `visibleToClient: false`. Klient by neměl vidět reporty, které terapeut ještě nezveřejnil.
- **Doporučení:** V API filtrovat `visibleToClient === true` pro roli CLIENT.

### Zaplacení bez kreditu – jen recepce, ne admin
- Feature „Reservation paid without credit" (tlačítko „Označit jako zaplaceno") existuje na `reception/appointments/[id]`, ale ne na admin stránce (admin nemá appointment detail stránku; fakticky naviguje na reception layout).

---

## 20. Co už je opraveno

- **Deaktivovaný terapeut a sloty:** API `/availability` a `/availability/bookable-days` zahrnují jen aktivní terapeuty; skript `scripts/validate-business-rules.mjs` to ověřuje.
- **Dokumentace obchodních pravidel:** `docs/BUSINESS-RULES.md`.
- **XSS:** V projektu se nepoužívá `dangerouslySetInnerHTML`.
- **Error boundary:** `console.error` v `src/app/error.tsx` je záměrný pro logování.

---

## Priorita oprav (doporučené pořadí)

1. **Kritická:** Sekce 2 / A3 (API autorizace – RBAC na backendu).
2. **Vysoká:** Sekce 8 (JWT_SECRET, CORS, rate limiting, dev login v produkci – 19).
3. **Vysoká:** 1.1, 1.2, 1.3, 1.4 (validace na API – služby/místnosti/terapeut aktivní, kolize termínů, čas start/end).
4. **Vysoká:** 13.1, 13.2 (SMS kód Math.random, rate limit pro SMS).
5. **Vysoká:** AD2, AD3 (chybějící CRUD UI pro služby a místnosti – akceptační kritéria).
6. **Vysoká:** G3 (chybějící PWA ikony).
7. **Vysoká:** 3.1, 3.2 (frontend zobrazuje jen aktivní terapeuty/služby/místnosti).
8. **Vysoká:** 19 – klient vidí i neviditelné reporty (`visibleToClient` ignorováno).
9. **Střední:** 13.3, 13.4, 13.5, 19 – registrace case (notifikace bez userId, case, přečtení cizí).
10. **Střední:** 11.3, 11.4, 11.5, 18/admin-billing (admin invoice edit route, záporné kredity, faktura za zrušené).
11. **Střední:** Sekce 9 (API robustnost – rozsah dat, validace datumů).
12. **Střední:** 3.3, 3.4 (validace času na formuláři Nová rezervace, reakce na 401).
13. **Střední:** 4.1 (obsluha chyb načítání na stránkách).
14. **Střední:** 5.1, 5.2, 5.3, 5.4 (loading, prázdné stavy, aria-label, flash obsahu).
15. **Střední:** 10.1, 10.2 (Modal focus trap, React key u slotů).
16. **Střední:** 15.1, 15.2, 15.4 (Zod: endAt > startAt, stringy bez max, čas jako regex).
17. **Nižší:** 6.1, 6.2, 6.3, 7.1–7.4, 8.4, 8.5, 10.3, 10.4, 11.1–11.2, 12.1–12.4, 14.1–14.3, 15.3, 15.5, 16.1, 16.2, 19 robots/sitemap, D1 mock mode.

Po opravách lze rozšířit `scripts/validate-business-rules.mjs` nebo E2E testy o další kontrolované invarianty.
