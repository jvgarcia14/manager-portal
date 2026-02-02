import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const team = String(searchParams.get("team") || "");

  try {
    const db = salesDb();

    // ✅ Adjust to your schema. This assumes:
    // table: sales
    // columns: team, amount, created_at
    const res = await db.query(
      `
      SELECT
        COALESCE(SUM(amount)::numeric, 0) AS total_15d,
        COALESCE(SUM(CASE WHEN created_at::date = (now() AT TIME ZONE 'Asia/Manila')::date THEN amount ELSE 0 END)::numeric, 0) AS today
      FROM sales
      WHERE created_at >= now() - interval '15 days'
        AND ($1 = '' OR team = $1)
      `,
      [team]
    );

    return NextResponse.json({
      team,
      today: Number(res.rows[0]?.today || 0),
      total15d: Number(res.rows[0]?.total_15d || 0),
    });
  } catch {
    // Demo fallback
    return NextResponse.json({
      team,
      today: 0,
      total15d: 5302.59,
      demo: true,
    });
  }
}
