// utils/db.js
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const dbPath =
  process.env.SQLITE_DB_PATH || path.join(process.cwd(), "local.db");
const db = new Database(dbPath);

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
