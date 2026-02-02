import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = salesDb();
  const res = await db.query(`
    SELECT DISTINCT name
    FROM teams
    ORDER BY name ASC
  `);

  return NextResponse.json({ teams: res.rows.map((r) => String(r.name)) });
}
