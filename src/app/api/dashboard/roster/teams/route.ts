import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireApproved } from "@/lib/requireApproved";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function ensureTables() {
  const db = websiteDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS roster_teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS roster_team_pages (
      team_id INT NOT NULL REFERENCES roster_teams(id) ON DELETE CASCADE,
      page_key TEXT NOT NULL,
      page_label TEXT NOT NULL,
      PRIMARY KEY (team_id, page_key)
    );
  `);
}

// ✅ Approved users can view teams
export async function GET() {
  const gate = await requireApproved();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  try {
    await ensureTables();
    const db = websiteDb();
    const r = await db.query(`SELECT id, name FROM roster_teams ORDER BY name ASC`);
    return NextResponse.json({ teams: r.rows });
  } catch (e: any) {
    return NextResponse.json({ error: "failed to load teams", detail: String(e?.message || e) }, { status: 500 });
  }
}

// ✅ Approved users can create teams
export async function POST(req: Request) {
  const gate = await requireApproved();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  try {
    await ensureTables();

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const db = websiteDb();
    const r = await db.query(
      `
      INSERT INTO roster_teams(name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
      `,
      [name]
    );

    return NextResponse.json({ team: r.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: "failed to create team", detail: String(e?.message || e) }, { status: 500 });
  }
}
