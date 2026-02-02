import "server-only";
import { Pool } from "pg";

const connectionString = process.env.WEBSITE_DATABASE_URL;

if (!connectionString) {
  throw new Error("WEBSITE_DATABASE_URL is not set");
}

export const websitePool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

let schemaReady = false;

/**
 * Ensures required tables exist.
 * Safe to call multiple times; runs only once per server instance.
 */
export async function ensureWebsiteSchema() {
  if (schemaReady) return;

  await websitePool.query(`
    CREATE TABLE IF NOT EXISTS web_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'manager',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login_at TIMESTAMPTZ
    );
  `);

  schemaReady = true;
}
