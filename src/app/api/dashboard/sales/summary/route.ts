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

  // IMPORTANT: Update these table/column names to match your sales bot DB.
  // This assumes a table sales_logs with: created_at, team, amount
  // And "today" is based on Asia/Manila day boundary.
  const resToday = await db.query(
    `
    WITH now_ph AS (
      SELECT (now() AT TIME ZONE 'Asia/Manila') AS t
    ),
    day_ph AS (
      SELECT (date_trunc('day', t))::date AS d FROM now_ph
    )
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM sales_logs
    WHERE team = $1
      AND (created_at AT TIME ZONE 'Asia/Manila')::date = (SELECT d FROM day_ph)
    `,
    [team]
  );

  const res15 = await db.query(
    `
    WITH start_ph AS (
      SELECT ((now() AT TIME ZONE 'Asia/Manila')::date - 14) AS d
    )
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM sales_logs
    WHERE team = $1
      AND (created_at AT TIME ZONE 'Asia/Manila')::date >= (SELECT d FROM start_ph)
    `,
    [team]
  );

  return NextResponse.json({
    team,
    todaySales: Number(resToday.rows?.[0]?.total ?? 0),
    totalSales15d: Number(res15.rows?.[0]?.total ?? 0),
  });
}
