/**
 * Business-rules validation: run after build to ensure critical invariants.
 * Usage: from repo root: node scripts/validate-business-rules.mjs
 * Requires: apps/api built (pnpm --filter api build) so we can import the dist.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDist = join(__dirname, "..", "apps", "api", "dist");

let getActiveEmployeesForAvailability;
try {
  const mod = await import(join(apiDist, "routes", "availability.js"));
  getActiveEmployeesForAvailability = mod.getActiveEmployeesForAvailability;
} catch (e) {
  console.error("API dist not found. Run: pnpm --filter api build");
  process.exit(1);
}

function minimalStore() {
  const users = new Map();
  users.set("emp1", {
    id: "emp1",
    role: "EMPLOYEE",
    active: true,
    name: "Terapeut 1",
    email: "t1@test.cz",
  });
  users.set("emp2", {
    id: "emp2",
    role: "EMPLOYEE",
    active: false,
    name: "Terapeut 2",
    email: "t2@test.cz",
  });
  users.set("client1", { id: "client1", role: "CLIENT", active: true, name: "Klient", email: "c@test.cz" });
  return {
    users,
    appointments: new Map(),
    bookingActivations: new Map(),
  };
}

const errors = [];
const store = minimalStore();
const active = getActiveEmployeesForAvailability(store);

if (active.length !== 1 || active[0].id !== "emp1") {
  errors.push("Deaktivovaný terapeut (active=false) nesmí být v seznamu pro dostupnost slotů.");
}
if (active.some((u) => u.id === "emp2")) {
  errors.push("emp2 je neaktivní a nesmí být v getActiveEmployeesForAvailability.");
}

if (errors.length > 0) {
  console.error("Business rules validation FAILED:");
  errors.forEach((e) => console.error("  -", e));
  process.exit(1);
}

console.log("Business rules validation OK (deaktivovaný terapeut není ve výběru pro sloty).");
process.exit(0);
