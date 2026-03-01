import { websiteDb } from "@/lib/db";

let initialized = false;

export async function initUsersTables() {
  if (initialized) return;

  const db = websiteDb();

  // pgcrypto optional (safe)
  try {
    await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  } catch {}

  await db.query(`
    CREATE TABLE IF NOT EXISTS web_users (
      email TEXT PRIMARY KEY,
      name TEXT,
      status TEXT DEFAULT 'pending',   -- pending | approved
      role TEXT DEFAULT 'user',        -- user | coach | manager | admin
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // (optional) ensure columns exist if table was old
  try { await db.query(`ALTER TABLE web_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`); } catch {}
  try { await db.query(`ALTER TABLE web_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';`); } catch {}
  try { await db.query(`ALTER TABLE web_users ADD COLUMN IF NOT EXISTS name TEXT;`); } catch {}
  try { await db.query(`ALTER TABLE web_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`); } catch {}

  initialized = true;
}