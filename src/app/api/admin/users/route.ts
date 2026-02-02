import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function requireAdmin(auth: any) {
  if (!auth?.ok) return { ok: false, status: 401, error: auth?.error || "Unauthorized" };
  if (auth?.role !== "admin") return { ok: false, status: 403, error: "Admin only" };
  return { ok: true, status: 200, error: "" };
}

// GET /api/admin/users?status=pending|approved|all
export async function GET(req: Request) {
  const auth = await requireApprovedSession();
  const admin = requireAdmin(auth);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "pending").trim().toLowerCase();

  const db = websiteDb();

  try {
    // Make sure table exists (safe)
    await db.query(`
      CREATE TABLE IF NOT EXISTS web_users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'manager',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_login_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    let where = "";
    const params: any[] = [];

    if (status !== "all") {
      where = "WHERE status = $1";
      params.push(status);
    }

    const res = await db.query(
      `
      SELECT id, email, name, role, status, created_at
      FROM web_users
      ${where}
      ORDER BY created_at DESC
      LIMIT 200
      `,
      params
    );

    return NextResponse.json({ users: res.rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load users", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// POST /api/admin/users  body: { id: number, action: "approve" | "reject", role?: "admin"|"manager" }
export async function POST(req: Request) {
  const auth = await requireApprovedSession();
  const admin = requireAdmin(auth);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  const action = String(body?.action || "").toLowerCase();
  const role = String(body?.role || "manager").toLowerCase();

  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid body. Need { id, action }" }, { status: 400 });
  }
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "role must be admin or manager" }, { status: 400 });
  }

  const db = websiteDb();

  try {
    if (action === "approve") {
      await db.query(
        `UPDATE web_users SET status='approved', role=$2 WHERE id=$1`,
        [id, role]
      );
    } else {
      await db.query(`UPDATE web_users SET status='rejected' WHERE id=$1`, [id]);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to update user", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
