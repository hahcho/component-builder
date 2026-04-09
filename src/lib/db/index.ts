import Database from 'better-sqlite3';
import path from 'path';
import { initSchema } from './schema';

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;
  const dbPath = path.join(process.cwd(), 'data', 'component-builder.db');
  db = new Database(dbPath);
  initSchema(db);
  return db;
}
