// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/requireAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "pending").toLowerCase();

  const db = websiteDb();

  const where =
    status === "all"
      ? ""
      : status === "approved"
        ? "WHERE status='approved'"
        : "WHERE status='pending'";

  const res = await db.query(
    `
    SELECT email, status, role, created_at
    FROM web_users
    ${where}
    ORDER BY created_at DESC
    `
  );

  return NextResponse.json({ rows: res.rows || [] });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const action = String(body.action || "");

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = websiteDb();

  if (action === "approve") {
    await db.query(`UPDATE web_users SET status='approved' WHERE email=$1`, [email]);
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await db.query(`DELETE FROM web_users WHERE email=$1`, [email]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
