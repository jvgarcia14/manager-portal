import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  // Only allow admin role to view all users
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = websiteDb();

  // Expected: portal_users(id, email, status, created_at)
  const r = await db.query(
    `SELECT id, email, status, created_at
     FROM portal_users
     ORDER BY created_at DESC
     LIMIT 200`
  );

  return NextResponse.json({ users: r.rows });
}

export async function POST(req: Request) {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const status = String(body.status || "").trim().toLowerCase(); // "approved" | "pending"

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  if (!["approved", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = websiteDb();
  await db.query(
    `UPDATE portal_users SET status=$2 WHERE lower(email)=lower($1)`,
    [email, status]
  );

  return NextResponse.json({ ok: true });
}
