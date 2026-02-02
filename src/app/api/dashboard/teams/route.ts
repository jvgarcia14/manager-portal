import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = salesDb();

  // Tries to find teams table (your sales bot should have it)
  // If your schema is different, change this query to match.
  const res = await db.query(`
    SELECT DISTINCT name
    FROM teams
    ORDER BY name ASC
  `);

  const teams = res.rows.map((r: any) => String(r.name));
  return NextResponse.json({ teams });
}
