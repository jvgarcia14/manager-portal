// src/lib/websiteDb.ts
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

  // 1) Web users (managers/admins)
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

  // 2) Allowed pages (used in website UI)
  await websitePool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      tag TEXT PRIMARY KEY,                      -- e.g. "islafree" (NO #)
      label TEXT NOT NULL,                       -- e.g. "Isla Free"
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 3) updated_at helper (shared trigger function)
  await websitePool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 4) Trigger for pages.updated_at
  await websitePool.query(`
    DROP TRIGGER IF EXISTS trg_pages_updated_at ON pages;
    CREATE TRIGGER trg_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  // 5) ✅ Masterlist slots (stored in WEBSITE DB)
  // This stores the "official" main chatter per page+shift.
  // Attendance overlay will show #cover when cover is clocked in, but sales stay per chatter.
  await websitePool.query(`
    CREATE TABLE IF NOT EXISTS masterlist_slots (
      id BIGSERIAL PRIMARY KEY,
      page_key TEXT NOT NULL,                    -- normalized tag (matches EXPECTED_PAGES keys)
      shift TEXT NOT NULL CHECK (shift IN ('prime','midshift','closing')),
      main_tg_username TEXT,                     -- store username WITHOUT "@"
      main_display_name TEXT,                    -- Telegram profile name
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (page_key, shift)
    );
  `);

  // Helpful index
  await websitePool.query(`
    CREATE INDEX IF NOT EXISTS idx_masterlist_slots_page_key
    ON masterlist_slots(page_key);
  `);

  // Trigger for masterlist_slots.updated_at
  await websitePool.query(`
    DROP TRIGGER IF EXISTS trg_masterlist_slots_updated_at ON masterlist_slots;
    CREATE TRIGGER trg_masterlist_slots_updated_at
    BEFORE UPDATE ON masterlist_slots
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  schemaReady = true;
}