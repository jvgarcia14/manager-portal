import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { websiteDb } from "@/lib/db";

export async function getApprovalStatus(email?: string | null) {
  if (!email) return { status: "anonymous" as const, role: "user" as const };

  const db = websiteDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS portal_users (
      email TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      role   TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ensure row exists
  await db.query(
    `INSERT INTO portal_users (email) VALUES ($1)
     ON CONFLICT (email) DO NOTHING`,
    [email]
  );

  const res = await db.query(
    `SELECT status, role FROM portal_users WHERE email=$1 LIMIT 1`,
    [email]
  );

  const status = String(res.rows?.[0]?.status ?? "pending");
  const role = String(res.rows?.[0]?.role ?? "user");
  return { status, role };
}

export async function requireApprovedSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, status: 401, error: "not_signed_in" };
  }

  const { status, role } = await getApprovalStatus(session.user.email);

  if (status !== "approved") {
    return { ok: false as const, status: 403, error: "not_approved", userStatus: status, role };
  }

  return { ok: true as const, status: 200, session, userStatus: status, role };
}

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, status: 401, error: "not_signed_in" };
  }

  const { status, role } = await getApprovalStatus(session.user.email);

  if (status !== "approved") {
    return { ok: false as const, status: 403, error: "not_approved", userStatus: status, role };
  }
  if (role !== "admin") {
    return { ok: false as const, status: 403, error: "not_admin", userStatus: status, role };
  }

  return { ok: true as const, status: 200, session, userStatus: status, role };
}
