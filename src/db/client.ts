import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config, ensureDataDirs } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

/**
 * Open (once) the SQLite database, applying the schema. Synchronous by design —
 * better-sqlite3 is synchronous, which is ideal for a single-user local app.
 */
export function getDb(): Database.Database {
  if (db) return db;
  ensureDataDirs();
  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
