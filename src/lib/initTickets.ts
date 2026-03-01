import { websiteDb } from "@/lib/db";

let initialized = false;

export async function initTicketTables() {
  if (initialized) return;

  const db = websiteDb();

  try {
    await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  } catch {}

  await db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_by TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'open',          -- open | answered | closed
      kind TEXT DEFAULT 'ticket',          -- ticket | announcement
      pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ✅ Safe upgrades for older tables
  try { await db.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'ticket';`); } catch {}
  try { await db.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;`); } catch {}

  initialized = true;
}