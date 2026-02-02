import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = websiteDb();
  const res = await db.query(
    `SELECT email, status, role, created_at, updated_at
     FROM portal_users
     ORDER BY created_at DESC
     LIMIT 200`
  );

  return NextResponse.json({ users: res.rows });
}

export async function POST(req: Request) {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase();
  const status = String(body.status || "approved"); // approved/pending/blocked
  const role = String(body.role || "user"); // user/admin

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const db = websiteDb();
  await db.query(
    `INSERT INTO portal_users (email, status, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET status=$2, role=$3, updated_at=now()`,
    [email, status, role]
  );

  return NextResponse.json({ ok: true });
}
