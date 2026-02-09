/**
 * SQLite client and Drizzle instance. DB path from env for production.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import * as schema from "./schema.js";

const defaultPath = path.join(process.cwd(), "data", "pristav.db");
const configuredPath = process.env.DATABASE_PATH ?? defaultPath;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveDbPath(): string {
  const candidates = [configuredPath, defaultPath];
  for (const p of candidates) {
    try {
      const dir = path.dirname(p);
      ensureDir(dir);
      return p;
    } catch (err) {
      const code = err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : null;
      if (code === "EACCES" || code === "EPERM") {
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Cannot create database directory for ${configuredPath} or ${defaultPath}`);
}

let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let dbPath: string | null = null;

export function getDbPath(): string {
  return dbPath ?? configuredPath;
}

export function initDb(): Database.Database {
  if (sqlite) return sqlite;
  dbPath = resolveDbPath();
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  return sqlite;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) initDb();
  return db!;
}

export function closeDb(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}
