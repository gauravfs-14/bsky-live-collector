// utils/db.js
import Database from "better-sqlite3";
import { DB_PATH } from "../config";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const db = new Database(path.join(__dirname, "..", DB_PATH));

// Optional: Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS posts_unlabeled (
    uri TEXT PRIMARY KEY,
    did TEXT,
    text TEXT,
    created_at TEXT,
    langs TEXT,
    facets TEXT,
    reply TEXT,
    embed TEXT,
    ingestion_time TEXT
  )
`);

export default db;
