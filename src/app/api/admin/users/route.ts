import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/requireAdmin";
import { initUsersTables } from "@/lib/initUsers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  await initUsersTables();
  const db = websiteDb();

  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "pending").toLowerCase();

  try {
    let whereSql = "";
    const params: any[] = [];

    if (status === "approved") {
      whereSql = "WHERE status = $1";
      params.push("approved");
    } else if (status === "pending") {
      whereSql = "WHERE status IS NULL OR status = $1";
      params.push("pending");
    } else {
      whereSql = "";
    }

    const res = await db.query(
      `
      SELECT email, name, status, role, created_at
      FROM web_users
      ${whereSql}
      ORDER BY created_at DESC NULLS LAST, email ASC
      `,
      params
    );

    return NextResponse.json({ rows: res.rows || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  await initUsersTables();
  const db = websiteDb();

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const action = String(body.action || "").toLowerCase().trim();
  const role = body.role ? String(body.role).toLowerCase().trim() : null;

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const validRoles = new Set(["user", "coach", "manager", "admin"]);
  if (role && !validRoles.has(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  try {
    if (action === "approve") {
      const r = await db.query(
        `UPDATE web_users SET status='approved' WHERE email=$1 RETURNING email`,
        [email]
      );
      if ((r.rowCount || 0) === 0) {
        return NextResponse.json({ error: "user not found in web_users" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      await db.query(`DELETE FROM web_users WHERE email=$1`, [email]);
      return NextResponse.json({ ok: true });
    }

    // ✅ NEW: set role only
    if (action === "set_role") {
      const r = await db.query(
        `UPDATE web_users SET role=$2 WHERE email=$1 RETURNING email`,
        [email, role]
      );
      if ((r.rowCount || 0) === 0) {
        return NextResponse.json({ error: "user not found in web_users" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update user" }, { status: 500 });
  }
}