import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error, status: auth.status }, { status: 401 });

  try {
    const db = salesDb();

    // Expecting a sales table with a team/team_name column.
    // If your bot schema is different, tell me table+columns and I’ll rewrite.
    const res = await db.query(`
      SELECT DISTINCT team
      FROM sales
      WHERE team IS NOT NULL AND team <> ''
      ORDER BY team ASC
    `);

    const teams = res.rows.map((r: any) => String(r.team));
    return NextResponse.json({ teams });
  } catch (e: any) {
    return NextResponse.json({ teams: [], error: e?.message || "teams query failed" }, { status: 500 });
  }
}
