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
 * Auto-creates required tables in the Website DB.
 * Safe to call multiple times; runs once per server instance.
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
      last_login_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // ✅ NEW: allowed pages table
  await websitePool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      tag TEXT PRIMARY KEY,                      -- e.g. "islafree" (NO #)
      label TEXT NOT NULL,                       -- e.g. "Isla Free"
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ✅ NEW: auto update updated_at
  await websitePool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await websitePool.query(`
    DROP TRIGGER IF EXISTS trg_pages_updated_at ON pages;
    CREATE TRIGGER trg_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  schemaReady = true;
}