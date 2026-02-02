import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { websiteDb } from "@/lib/db";

function parseAdminEmails(v?: string) {
  return (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireApprovedSession() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!session || !email) {
    return { ok: false as const, status: "signed_out" as const, error: "Not signed in" };
  }

  // Admin override
  const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (admins.includes(email)) {
    return { ok: true as const, status: "approved" as const, role: "admin" as const, email };
  }

  // Check website DB approval status
  try {
    const db = websiteDb();

    // Table expected: users(email text primary key, status text, role text)
    // If your table name/columns differ, tell me your schema and I’ll adjust.
    const res = await db.query(
      `SELECT status, COALESCE(role,'user') as role
       FROM users
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email]
    );

    const row = res.rows[0];
    const status = row?.status || "pending";
    const role = row?.role || "user";

    if (status !== "approved") {
      return { ok: false as const, status, error: "Awaiting approval" };
    }

    return { ok: true as const, status: "approved" as const, role, email };
  } catch (e: any) {
    // If DB fails, don’t crash the app; return error JSON
    return {
      ok: false as const,
      status: "error" as const,
      error: e?.message || "DB error",
    };
  }
}
