# Obchodní pravidla a invarianty

Tento dokument popisuje základní pravidla aplikace, která musí platit vždy. Kontrola části z nich je automatizovaná (skript nebo testy).

## 1. Terapeuti (EMPLOYEE) a aktivita

- **Deaktivovaný terapeut (`active: false`) nesmí mít volné sloty v rezervačním systému.**
  - API: endpointy `/availability` a `/availability/bookable-days` zahrnují pouze uživatele s `role === "EMPLOYEE"` a `active !== false`.
  - Když administrátor v Admin → Uživatelé deaktivuje terapeuta, jeho stávající rezervace zůstanou v systému (údaje se nemazou), ale **nové rezervace na něj už nejde vytvořit** – nebude se zobrazovat v dostupných dnech/slotech.
- **Kontrola:** `node scripts/validate-business-rules.mjs` (vyžaduje `pnpm --filter api build`).

## 2. Přihlášení a autorizace

- Neaktivní uživatel (`active: false`) se nemůže přihlásit (auth middleware vrací 401).
- Pouze ADMIN může měnit roli a aktivitu uživatelů (Admin → Uživatelé).

## 3. Aktivace rezervací (booking activation)

- Recepce zapíná/vypíná rezervace **po měsících** a **po terapeutech** (Aktivace rezervací).
- Terapeut bez zapnuté aktivace pro daný měsíc nemá v tom měsíci volné sloty v bookable-days.
- V seznamu terapeutů v Aktivaci rezervací se zobrazují všichni EMPLOYEE (včetně neaktivních), aby recepce viděla celou tabulku; **ale do výpočtu dostupných slotů vstupují jen aktivní terapeuti** (viz bod 1).

## 4. Další pravidla (kontrolujte ručně / rozšířit automatizaci)

- Služby a místnosti s `active: false` by neměly být nabízeny při vytváření rezervace (pokud je v UI filtrujete).
- Fakturace: neplatné / zrušené rezervace se do faktur nepočítají dle business logiky.
- SMS/email: odesílají se pouze klientům s vyplněným telefonem/e-mailem dle kontextu.

---

**Spuštění automatické kontroly:**  
`pnpm --filter api build && node scripts/validate-business-rules.mjs`
