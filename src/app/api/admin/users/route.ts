import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = websiteDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS portal_users (
      email TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      role   TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const res = await db.query(
    `SELECT email, status, role, created_at
     FROM portal_users
     ORDER BY created_at DESC
     LIMIT 200`
  );

  return NextResponse.json({ rows: res.rows });
}

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "");
  const status = String(body.status || "pending");

  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const db = websiteDb();
  await db.query(
    `UPDATE portal_users SET status=$2 WHERE email=$1`,
    [email, status]
  );

  return NextResponse.json({ ok: true });
}
