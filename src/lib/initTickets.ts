import { websiteDb } from "@/lib/db";

let initialized = false;

export async function initTicketTables() {
  if (initialized) return;

  const db = websiteDb();

  // ✅ Ensure UUID function exists (Railway usually supports this, but this prevents “stuck loading”)
  // If permission is denied, it won't crash the app.
  try {
    await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  } catch {
    // ignore if no permission
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_by TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'open',
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

  initialized = true;
}