/**
 * SQLite client and Drizzle instance. DB path from env for production.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import * as schema from "./schema.js";

const defaultPath = path.join(process.cwd(), "data", "pristav.db");
const dbPath = process.env.DATABASE_PATH ?? defaultPath;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDbPath(): string {
  return dbPath;
}

export function initDb(): Database.Database {
  if (sqlite) return sqlite;
  ensureDir(path.dirname(dbPath));
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
