import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team") ?? "Black";

  const db = salesDb();

  // IMPORTANT: Update table/columns to match your DB.
  // Assumes: sales_logs(team, page, amount, created_at)
  const res = await db.query(
    `
    WITH start_ph AS (
      SELECT ((now() AT TIME ZONE 'Asia/Manila')::date - 14) AS d
    )
    SELECT
      page,
      COALESCE(SUM(amount), 0) AS total
    FROM sales_logs
    WHERE team = $1
      AND (created_at AT TIME ZONE 'Asia/Manila')::date >= (SELECT d FROM start_ph)
    GROUP BY page
    ORDER BY total DESC
    LIMIT 50
    `,
    [team]
  );

  const rows = res.rows.map((r: any) => ({
    page: String(r.page),
    total: Number(r.total ?? 0),
    goal: null,
  }));

  return NextResponse.json({ rows });
}
