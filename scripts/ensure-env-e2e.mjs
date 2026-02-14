#!/usr/bin/env node
/**
 * Pro E2E: pokud neexistuje .env, zkopíruje .env.example → .env,
 * aby Next.js měl NEXT_PUBLIC_API_MODE=http a backend byl dostupný.
 */
import { copyFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

if (!existsSync(envPath) && existsSync(examplePath)) {
  copyFileSync(examplePath, envPath);
  console.log("[E2E] Vytvořen .env z .env.example pro lokální testy.");
}
