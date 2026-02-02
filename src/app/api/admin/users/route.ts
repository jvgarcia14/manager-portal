import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";

function isAdminEmail(email?: string | null) {
  const raw = process.env.ADMIN_EMAILS || "";
  const list = raw
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase() ?? null;

  if (!email) return { ok: false as const, reason: "unauthenticated" };
  if (!isAdminEmail(email)) return { ok: false as const, reason: "forbidden" };

  return { ok: true as const, email };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.reason }, { status: 401 });

  await ensureWebsiteSchema();

  const { rows } = await websitePool.query(
    `SELECT id, email, name, role, status, created_at, last_login_at
     FROM web_users
     ORDER BY created_at DESC`
  );

  return NextResponse.json({ users: rows });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.reason }, { status: 401 });

  await ensureWebsiteSchema();

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const status = body?.status; // "approved" | "pending" | "rejected"
  const role = body?.role;     // "admin" | "manager"

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Only allow specific values (safe)
  const statusOk = ["approved", "pending", "rejected"].includes(status);
  const roleOk = role == null || ["admin", "manager"].includes(role);

  if (!statusOk) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (!roleOk) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const params: any[] = [id, status];
  let setRoleSql = "";
  if (role) {
    params.push(role);
    setRoleSql = `, role = $3`;
  }

  const { rows } = await websitePool.query(
    `UPDATE web_users
     SET status = $2 ${setRoleSql}
     WHERE id = $1
     RETURNING id, email, name, role, status, created_at, last_login_at`,
    params
  );

  return NextResponse.json({ user: rows[0] ?? null });
}
