import { websiteDb } from "@/lib/db";
import { initUsersTables } from "@/lib/initUsers";

export async function ensurePortalUser(email: string, name?: string | null) {
  await initUsersTables();
  const db = websiteDb();

  const e = String(email || "").toLowerCase().trim();
  if (!e) return;

  await db.query(
    `
    INSERT INTO web_users (email, name)
    VALUES ($1, $2)
    ON CONFLICT (email) DO UPDATE
      SET name = COALESCE(web_users.name, EXCLUDED.name)
    `,
    [e, name || null]
  );
}