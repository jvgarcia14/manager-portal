import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { websiteDb } from "@/lib/db";

export const runtime = "nodejs";

function parseAdminEmails(v?: string) {
  return (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireApprovedSession() {
  const session = await getServerSession(authOptions);
  const email = String(session?.user?.email || "").toLowerCase();

  if (!session || !email) {
    return { ok: false as const, status: "signed_out" as const, error: "Not signed in" };
  }

  // Admin override from ENV
  const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (admins.includes(email)) {
    return { ok: true as const, status: "approved" as const, role: "admin" as const, email };
  }

  // Website DB approval
  try {
    const db = websiteDb();
    const res = await db.query(
      `SELECT status, role FROM portal_users WHERE email=$1 LIMIT 1`,
      [email]
    );

    const status = String(res.rows?.[0]?.status || "pending");
    const role = String(res.rows?.[0]?.role || "user");

    if (status !== "approved") {
      return {
        ok: false as const,
        status: status as any,
        error: "Awaiting admin approval",
      };
    }

    return { ok: true as const, status: "approved" as const, role: role as any, email };
  } catch {
    return { ok: false as const, status: "pending" as const, error: "Approval DB unavailable" };
  }
}
