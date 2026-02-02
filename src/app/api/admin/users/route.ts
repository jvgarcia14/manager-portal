import { NextResponse } from "next/server";
import { requireApprovedSession } from "@/lib/requireApproved";
import { websiteDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();

  // must be approved
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, status: auth.status },
      { status: 401 }
    );
  }

  // must be admin
  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 403 }
    );
  }

  try {
    const db = websiteDb();
    const res = await db.query(
      `SELECT email, COALESCE(role,'user') as role, COALESCE(status,'pending') as status
       FROM users
       ORDER BY status ASC, email ASC
       LIMIT 200`
    );

    return NextResponse.json({ users: res.rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load users" },
      { status: 500 }
    );
  }
}
