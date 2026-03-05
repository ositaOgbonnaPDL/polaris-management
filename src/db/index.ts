import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

// In Next.js the process runs from the project root
const DB_PATH = path.join(process.cwd(), "data", "polaris_management.db");

const sqlite = new Database(DB_PATH);

// Enable WAL mode — critical for SQLite in a web app
// WAL allows concurrent reads while a write is happening
// Without this, any write locks the entire database
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
